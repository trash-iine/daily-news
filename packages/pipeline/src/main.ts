import type { BaseItem } from "@daily-news/shared";
import {
  ARXIV_CATEGORIES,
  BIG_TAG_GROUPS,
  BIG_TAG_GROUP_ORDER,
  HN_QUERIES,
  KEYWORD_WEIGHTS,
  NEGATIVE_KEYWORDS,
  NEWS_MAX_AGE_HOURS,
  NEWS_MIN_PER_GROUP,
  NEWS_SCORE_THRESHOLD,
  NEWS_SEEN_LOOKBACK_DAYS,
  NEWS_TOP_N,
  PAPERS_TOP_N,
  PAPER_KEYWORDS,
  PAPER_PRIORITY_KEYWORDS,
  PAPER_SCORE_THRESHOLD,
  QIITA_API_TAGS,
  RSS_FEEDS,
  TAG_ALIASES,
  ZENN_API_TOPICS,
} from "./config.js";
import { hasNegativeKeyword, scoreFields } from "./score.js";
import { appendHealth } from "./cache.js";
import { fetchArxivCategory, type ArxivPaper } from "./sources/arxiv.js";
import { fetchHackerNewsQuery } from "./sources/hackerNews.js";
import { fetchQiitaTag } from "./sources/qiitaApi.js";
import { fetchRssFeed, type FeedFetchResult } from "./sources/rssFeeds.js";
import { fetchZennTopic } from "./sources/zennApi.js";
import type { RawItem } from "./sources/types.js";
import {
  loadRecentNewsIds,
  loadRecentPapers,
  updateIndex,
  writeDaily,
} from "./store.js";
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

/**
 * フィード取得を try で包み、健全性ログ (data/.cache/health.log) に
 * status / count / ms を JSON Lines で追記する。
 * 失敗時は空配列を返してパイプライン全体を続行させる。
 */
async function safeFeed(
  id: string,
  fn: () => Promise<FeedFetchResult>,
): Promise<RawItem[]> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    await appendHealth({
      ts: new Date().toISOString(),
      id,
      status: result.cached ? "cached" : "ok",
      count: result.items.length,
      ms: Date.now() - startedAt,
    });
    return result.items;
  } catch (err) {
    const message = (err as Error).message;
    console.warn(`[source] ${id} failed:`, message);
    await appendHealth({
      ts: new Date().toISOString(),
      id,
      status: "failed",
      count: 0,
      ms: Date.now() - startedAt,
      error: message,
    });
    return [];
  }
}

async function collectNews(): Promise<RawItem[]> {
  const sinceISO = new Date(
    Date.now() - NEWS_MAX_AGE_HOURS * 3600 * 1000,
  ).toISOString();
  const rssTasks = RSS_FEEDS.map((f) =>
    safeFeed(`rss:${f.id}`, () => fetchRssFeed(f.id, f.url, f.baseScore ?? 0)),
  );
  const qiitaTasks = QIITA_API_TAGS.map((t) =>
    safeFeed(`qiita-api:${t}`, () => fetchQiitaTag(t, sinceISO)),
  );
  const zennTasks = ZENN_API_TOPICS.map((t) =>
    safeFeed(`zenn-api:${t}`, () => fetchZennTopic(t, sinceISO)),
  );
  const hnTasks = HN_QUERIES.map((q) =>
    safeFeed(`hn:${q}`, () => fetchHackerNewsQuery(q)),
  );
  const all = await Promise.all([
    ...rssTasks,
    ...qiitaTasks,
    ...zennTasks,
    ...hnTasks,
  ]);
  return all.flat();
}

function isPopularityOnly(source: string): boolean {
  return source.startsWith("qiita-api:") || source.startsWith("zenn-api:");
}

function tagsFromSource(source: string): string[] {
  const m = /^(?:qiita-api|zenn-api):(.+)$/.exec(source);
  if (!m) return [];
  return canonicalTags([m[1] as string]);
}

/**
 * 各ソースの人気指標 (Qiita LGTM / Zenn いいね / HN points / RSS baseScore) を
 * 共通レンジに正規化する。
 * - Qiita / Zenn は生 likes_count を sqrt スケール (3 * sqrt) で 0〜30 程度に圧縮
 * - HN は sources/hackerNews.ts:pointsToBaseScore で既に sqrt 正規化済み (cap 15)
 * - RSS の baseScore はフィード重みなのでそのまま使う
 */
function popularityScore(source: string, baseScore: number): number {
  if (baseScore <= 0) return 0;
  if (source.startsWith("qiita-api:") || source.startsWith("zenn-api:")) {
    return Math.round(3 * Math.sqrt(baseScore));
  }
  return baseScore;
}

function primaryGroup(tags: string[]): string | undefined {
  for (const t of tags) {
    const g = BIG_TAG_GROUPS[t];
    if (g) return g;
  }
  return undefined;
}

const ARXIV_REQUEST_INTERVAL_MS = 3000;

async function collectPapers(): Promise<ArxivPaper[]> {
  // arXiv API ToU: "no more than one request every three seconds, and limit
  // requests to a single connection at a time" — 7 カテゴリを逐次取得する。
  const out: ArxivPaper[] = [];
  for (let i = 0; i < ARXIV_CATEGORIES.length; i++) {
    const c = ARXIV_CATEGORIES[i] as string;
    const items = await safe(`arxiv:${c}`, fetchArxivCategory(c));
    out.push(...items);
    if (i < ARXIV_CATEGORIES.length - 1) {
      await new Promise((r) => setTimeout(r, ARXIV_REQUEST_INTERVAL_MS));
    }
  }
  return out;
}

function rankNews(raw: RawItem[], seenIds: Set<string>): BaseItem[] {
  const fetchedAt = new Date().toISOString();
  const cleaned = raw.map((r) => ({
    ...r,
    title: cleanText(r.title),
    description: cleanText(r.description),
  }));
  // 直近 NEWS_MAX_AGE_HOURS 時間以内の item に限定
  const cutoff = Date.now() - NEWS_MAX_AGE_HOURS * 3600 * 1000;
  const fresh = cleaned.filter((r) => {
    const t = Date.parse(r.publishedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
  // 同一 URL が複数フィードから流れてくるため URL で重複除外
  const seenUrl = new Set<string>();
  const deduped = fresh.filter((r) => {
    if (!r.url || seenUrl.has(r.url)) return false;
    seenUrl.add(r.url);
    return true;
  });
  // 過去 NEWS_SEEN_LOOKBACK_DAYS 日の bundle に出た記事を除外
  const unseen = deduped.filter((r) => !seenIds.has(hashId(r.url)));
  // ネガティブキーワード（プロモ等）を除外
  const filtered = unseen.filter(
    (r) => !hasNegativeKeyword(r.title, r.description, NEGATIVE_KEYWORDS),
  );

  // 1) スコアリング: 全 item を 共通 popularity スコアで採点する。
  //    Qiita/Zenn は likes_count から sqrt 正規化、HN は既に正規化済み。
  //    HN/RSS は keyword score も加算 (人気と関連度の合算)。
  const scored = filtered.map((r) => {
    const popularity = popularityScore(r.source, r.baseScore ?? 0);
    if (isPopularityOnly(r.source)) {
      return {
        r,
        score: popularity,
        tags: tagsFromSource(r.source),
      };
    }
    const { score: kwScore, matched } = scoreFields(
      r.title,
      r.description,
      KEYWORD_WEIGHTS,
    );
    return {
      r,
      score: popularity + kwScore,
      tags: canonicalTags(matched),
    };
  });

  // 2) フィルタ: スコア閾値、および大タグ (BIG_TAG_GROUPS) に属さない item を除外。
  const eligible = scored
    .map((s) => ({ ...s, group: primaryGroup(s.tags) }))
    .filter((s) => s.score >= NEWS_SCORE_THRESHOLD && s.group !== undefined) as Array<{
      r: typeof scored[number]["r"];
      score: number;
      tags: string[];
      group: string;
    }>;

  const droppedNoGroup = scored.length - eligible.length;
  if (droppedNoGroup > 0) {
    console.log(
      `[main] dropped ${droppedNoGroup} news items (no big-tag group / below threshold)`,
    );
  }

  // 3) 既存ルール: github.com 直リンクは canonical タグごと最大 1 件 (HN 由来の
  //    レポ紹介で同タグが埋まるのを防ぐ既存挙動を維持)。スコア降順で並べてから filter。
  const ghPerTag = new Map<string, number>();
  const ghFiltered = eligible
    .slice()
    .sort((a, b) => b.score - a.score)
    .filter((s) => {
      if (!/github\.com/.test(s.r.url)) return true;
      const key = s.tags[0] ?? "";
      const n = ghPerTag.get(key) ?? 0;
      if (n >= 1) return false;
      ghPerTag.set(key, n + 1);
      return true;
    });

  // 4) 配分: 大タグごとに最低 NEWS_MIN_PER_GROUP 件を確保し、残りは全体 popularity 降順で埋める。
  const byGroup = new Map<string, typeof ghFiltered>();
  for (const s of ghFiltered) {
    const arr = byGroup.get(s.group) ?? [];
    arr.push(s);
    byGroup.set(s.group, arr);
  }
  for (const arr of byGroup.values()) {
    arr.sort((a, b) => b.score - a.score);
  }

  const picked = new Set<string>(); // dedup by URL
  const ordered: typeof ghFiltered = [];

  // 4a) 各 group から min 件ずつ採用
  for (let round = 0; round < NEWS_MIN_PER_GROUP; round++) {
    for (const group of BIG_TAG_GROUP_ORDER) {
      const arr = byGroup.get(group);
      if (!arr) continue;
      const next = arr.find((s) => !picked.has(s.r.url));
      if (!next) continue;
      ordered.push(next);
      picked.add(next.r.url);
      if (ordered.length >= NEWS_TOP_N) break;
    }
    if (ordered.length >= NEWS_TOP_N) break;
  }

  // 4b) 残り枠を全体 popularity 降順で埋める
  if (ordered.length < NEWS_TOP_N) {
    const remaining = ghFiltered.filter((s) => !picked.has(s.r.url));
    // ghFiltered は既に score 降順だが、念のため再ソート
    remaining.sort((a, b) => b.score - a.score);
    for (const s of remaining) {
      if (ordered.length >= NEWS_TOP_N) break;
      ordered.push(s);
      picked.add(s.r.url);
    }
  }

  return ordered.map(({ r, score, tags }) => ({
    id: hashId(r.url),
    kind: "news",
    title: r.title,
    url: r.url,
    summary: r.description.slice(0, 240),
    tags,
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

  // タイトル + abstract で照合 (タイトル一致は scoreFields 内で加重される)。
  // 元の GAS 実装は abstract のみだったが、タイトルにキーワードが入る論文は
  // 強い信号なので採用する。
  const scored: ScoredPaper[] = unique
    .map((p) => {
      const { score, matched } = scoreFields(p.title, p.abstract, PAPER_KEYWORDS);
      const haystack = `${p.title} ${p.abstract}`.toLowerCase();
      const priority = PAPER_PRIORITY_KEYWORDS.some((k) =>
        haystack.includes(k.toLowerCase()),
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

  return finalists.map(({ p, score, matched }, i) => ({
    id: hashId(p.absUrl),
    kind: "paper",
    title: p.title,
    url: p.absUrl,
    summary: summaries[i] ?? "",
    tags: canonicalTags(matched),
    score,
    source: p.source,
    publishedAt: p.publishedAt,
    fetchedAt,
  }));
}

async function main() {
  const date = todayString();
  console.log(`[main] running for ${date}`);

  const [rawNews, rawPapers, seenNewsIds] = await Promise.all([
    collectNews(),
    collectPapers(),
    loadRecentNewsIds(date, NEWS_SEEN_LOOKBACK_DAYS),
  ]);
  console.log(
    `[main] collected ${rawNews.length} news / ${rawPapers.length} papers; ${seenNewsIds.size} previously-seen news ids`,
  );

  const news = rankNews(rawNews, seenNewsIds);
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
