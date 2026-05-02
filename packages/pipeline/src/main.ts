import type { BaseItem } from "@daily-news/shared";
import {
  ARXIV_CATEGORIES,
  KEYWORD_WEIGHTS,
  NEWS_MAX_AGE_HOURS,
  NEWS_SCORE_THRESHOLD,
  NEWS_TOP_N,
  PAPERS_TOP_N,
  PAPER_KEYWORDS,
  PAPER_PRIORITY_KEYWORDS,
  PAPER_SCORE_THRESHOLD,
  RSS_FEEDS,
  TAG_ALIASES,
} from "./config.js";
import { scoreText } from "./score.js";
import { fetchArxivCategory, type ArxivPaper } from "./sources/arxiv.js";
import { fetchRssFeed } from "./sources/rssFeeds.js";
import type { RawItem } from "./sources/types.js";
import { loadRecentPapers, updateIndex, writeDaily } from "./store.js";
import { summarizePaper } from "./summarize.js";
import { fetchThumbnail } from "./thumbnail.js";
import { cleanText, hashId, todayString } from "./util.js";

const THUMBNAIL_CONCURRENCY = 8;

function canonicalTags(matched: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of matched) {
    const canon = TAG_ALIASES[m] ?? m;
    if (!seen.has(canon)) {
      seen.add(canon);
      out.push(canon);
    }
  }
  return out;
}

async function enrichWithThumbnails(items: BaseItem[]): Promise<BaseItem[]> {
  const results = items.slice();
  let cursor = 0;
  const workers = Array.from({ length: Math.min(THUMBNAIL_CONCURRENCY, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      const item = results[i];
      if (!item) return;
      const thumbnail = await fetchThumbnail(item.url);
      if (thumbnail) results[i] = { ...item, thumbnail };
    }
  });
  await Promise.all(workers);
  return results;
}

async function safe<T>(label: string, p: Promise<T[]>): Promise<T[]> {
  try {
    return await p;
  } catch (err) {
    console.warn(`[source] ${label} failed:`, (err as Error).message);
    return [];
  }
}

async function collectNews(): Promise<RawItem[]> {
  const tasks = RSS_FEEDS.map((f) =>
    safe(`rss:${f.id}`, fetchRssFeed(f.id, f.url, f.baseScore ?? 0)),
  );
  const all = await Promise.all(tasks);
  return all.flat();
}

async function collectPapers(): Promise<ArxivPaper[]> {
  const tasks = ARXIV_CATEGORIES.map((c) =>
    safe(`arxiv:${c}`, fetchArxivCategory(c)),
  );
  const all = await Promise.all(tasks);
  return all.flat();
}

function rankNews(raw: RawItem[]): BaseItem[] {
  const fetchedAt = new Date().toISOString();
  const cleaned = raw.map((r) => ({
    ...r,
    title: cleanText(r.title),
    description: cleanText(r.description),
  }));
  // 今日発行された (= 直近 NEWS_MAX_AGE_HOURS 時間以内の) item に限定
  const cutoff = Date.now() - NEWS_MAX_AGE_HOURS * 3600 * 1000;
  const fresh = cleaned.filter((r) => {
    const t = Date.parse(r.publishedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
  // Qiita 人気記事とタグ別フィードでは同一記事が複数フィードから流れてくるため URL で重複除外
  const seen = new Set<string>();
  const deduped = fresh.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  const scored = deduped.map((r) => {
    const { score: kwScore, matched } = scoreText(
      `${r.title} ${r.description}`,
      KEYWORD_WEIGHTS,
    );
    const score = kwScore + (r.baseScore ?? 0);
    return { r, score, matched };
  });
  return scored
    .filter((s) => s.score >= NEWS_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, NEWS_TOP_N)
    .map(({ r, score, matched }) => ({
      id: hashId(r.url),
      kind: "news",
      title: r.title,
      url: r.url,
      summary: r.description.slice(0, 240),
      tags: canonicalTags(matched),
      score,
      source: r.source,
      publishedAt: r.publishedAt,
      fetchedAt,
    }));
}

interface ScoredPaper {
  p: ArxivPaper;
  score: number;
  matched: string[];
  priority: boolean;
}

async function rankPapers(raw: ArxivPaper[]): Promise<BaseItem[]> {
  const fetchedAt = new Date().toISOString();

  // 新規投稿のみを採用（cross-listing / replace は除外）— GAS 版で API 検証していた挙動を
  // arXiv RSS の announce_type で代替する。
  const newOnly = raw.filter((p) => p.announceType === "new");

  // タイトル単位の重複除外（GAS 版 seen Set と同じ）
  const seen = new Set<string>();
  const unique = newOnly.filter((p) => {
    if (seen.has(p.title)) return false;
    seen.add(p.title);
    return true;
  });

  // GAS 版に倣い abstract に対してのみキーワードマッチ
  const scored: ScoredPaper[] = unique
    .map((p) => {
      const { score, matched } = scoreText(p.abstract, PAPER_KEYWORDS);
      const priority = PAPER_PRIORITY_KEYWORDS.some((k) =>
        p.abstract.toLowerCase().includes(k.toLowerCase()),
      );
      return { p, score, matched, priority };
    })
    .filter((s) => s.score >= PAPER_SCORE_THRESHOLD);

  // 優先キーワード → スコア降順 → 投稿日新しい順（GAS 版のソート規則）
  scored.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    if (a.score !== b.score) return b.score - a.score;
    return b.p.publishedAt.localeCompare(a.p.publishedAt);
  });

  const finalists = scored.slice(0, PAPERS_TOP_N);

  const summaries = await Promise.all(
    finalists.map(({ p }) => summarizePaper(p.title, p.abstract)),
  );

  return finalists.map(({ p, score, matched, priority }, i) => ({
    id: hashId(p.absUrl),
    kind: "paper",
    title: p.title,
    url: p.absUrl,
    summary: summaries[i] ?? "",
    tags: priority ? ["priority", ...canonicalTags(matched)] : canonicalTags(matched),
    score,
    source: p.source,
    publishedAt: p.publishedAt,
    fetchedAt,
  }));
}

async function main() {
  const date = todayString();
  console.log(`[main] running for ${date}`);

  const [rawNews, rawPapers] = await Promise.all([
    collectNews(),
    collectPapers(),
  ]);
  console.log(`[main] collected ${rawNews.length} news / ${rawPapers.length} papers`);

  const news = rankNews(rawNews);
  let papers = await rankPapers(rawPapers);
  console.log(`[main] selected ${news.length} news / ${papers.length} papers`);

  // arXiv RSS は土日 (skipDays) に空配信になるため、当日 0 件なら直近の論文を引き継ぐ
  if (papers.length === 0) {
    const fallback = await loadRecentPapers(date);
    if (fallback.length > 0) {
      papers = fallback;
      console.log(`[main] arxiv empty — carried over ${fallback.length} papers from prior bundle`);
    }
  }

  const items = [...papers, ...news];
  if (items.length === 0) {
    console.warn("[main] no items selected; nothing to write");
    return;
  }

  const enriched = await enrichWithThumbnails(items);
  const withThumbs = enriched.filter((i) => i.thumbnail).length;
  console.log(`[main] enriched ${withThumbs}/${enriched.length} items with thumbnails`);

  await writeDaily(date, enriched);
  await updateIndex(date);
  console.log(`[main] wrote data/${date}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
