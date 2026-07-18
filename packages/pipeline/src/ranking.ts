import type { BaseItem, TrendingItem } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import {
  BIG_TAG_GROUP_ORDER,
  KEYWORD_WEIGHTS,
  NEGATIVE_KEYWORDS,
  NEWS_MAX_AGE_HOURS,
  NEWS_MIN_PER_GROUP,
  NEWS_SCORE_THRESHOLD,
  NEWS_TOP_N,
  NEWS_TRENDING_MIN_VELOCITY,
  PAPER_KEYWORDS,
  PAPER_MULTI_MATCH_BONUS,
  PAPER_PRIORITY_KEYWORDS,
  PAPER_SCORE_THRESHOLD,
} from "./config.js";
import { hasNegativeKeyword, scoreFields } from "./score.js";
import {
  canonicalTags,
  defaultTagsFromSource,
  isPopularityOnly,
  languageBonus,
  popularityLabel,
  popularityScore,
  primaryGroup,
  tagsFromSource,
  velocityScore,
} from "./scoreModel.js";
import {
  isQuantumPaper,
  selectFinalists,
  type ScoredPaper,
} from "./paperFinalists.js";
import type { ArxivPaper } from "./sources/arxiv.js";
import type { RawItem } from "./sources/types.js";
import { summarizePaper } from "./summarize.js";
import { cleanText, hashId } from "./util.js";

/** hostname が github.com (サブドメイン含む) の URL のみ true。パス/クエリ中の文字列には反応しない。 */
function isGithubUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "github.com" || host.endsWith(".github.com");
  } catch {
    return false;
  }
}

export function rankNews(raw: RawItem[], seenIds: Set<string>): BaseItem[] {
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

  // 1) スコアリング:
  //    - merit  = popularity + kwScore (関連度・実力スコア。閾値判定に使う)
  //    - score  = merit + languageBonus(source)  (ランキングと表示に使う最終スコア)
  //    日本語ソース (Qiita/Zenn/日本語 RSS) には +15、英語の重要/低頻度ソース
  //    (Rust 公式 / PEPs / Google Research / Shtetl-Optimized) には +5、
  //    それ以外の英語 (HN / Quanta) は +0。これで日本語と重要英語を上位に押し上げ、
  //    HN は枠が余ったときのみ採用されるようになる。
  const scored = filtered.map((r) => {
    const popularity = popularityScore(r.source, r.baseScore ?? 0);
    const bonus = languageBonus(r.source);
    const popLabel = popularityLabel(r.source, r.baseScore ?? 0);
    if (isPopularityOnly(r.source)) {
      const merit = popularity;
      return {
        r,
        merit,
        score: merit + bonus,
        popularity,
        keywordScore: 0,
        languageBonus: bonus,
        matchedKeywords: [] as string[],
        popularityLabel: popLabel,
        tags: tagsFromSource(r.source),
      };
    }
    const { score: kwScore, matched } = scoreFields(
      r.title,
      r.description,
      KEYWORD_WEIGHTS,
    );
    const merit = popularity + kwScore;
    const canonMatched = canonicalTags(matched);
    // フィード設定の defaultTags は matched の後ろに append する。先頭を matched に
    // 保つことで github per-tag 制限 (s.tags[0]) 等の既存挙動を変えず、キーワード
    // 非一致の記事だけを big-tag 関門から救う。
    const tags = [...canonMatched];
    for (const t of defaultTagsFromSource(r.source)) {
      if (!tags.includes(t)) tags.push(t);
    }
    return {
      r,
      merit,
      score: merit + bonus,
      popularity,
      keywordScore: kwScore,
      languageBonus: bonus,
      matchedKeywords: canonMatched,
      popularityLabel: popLabel,
      tags,
    };
  });

  // 2) フィルタ: merit (実力) で閾値判定、および大タグ (BIG_TAG_GROUPS) に属さない item を除外。
  //    languageBonus は ranking のみに効かせ、低品質記事が bonus だけで通過するのを防ぐ。
  const eligible = scored
    .map((s) => ({ ...s, group: primaryGroup(s.tags) }))
    .filter((s) => s.merit >= NEWS_SCORE_THRESHOLD && s.group !== undefined) as Array<{
      r: typeof scored[number]["r"];
      merit: number;
      score: number;
      popularity: number;
      keywordScore: number;
      languageBonus: number;
      matchedKeywords: string[];
      popularityLabel: string | undefined;
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
      if (!isGithubUrl(s.r.url)) return true;
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

  // 4b) 残り枠を全体 score 降順で埋める
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

  return ordered.map((s) => ({
    id: hashId(s.r.url),
    kind: "news",
    title: s.r.title,
    url: s.r.url,
    summary: s.r.description.slice(0, 240),
    tags: s.tags,
    score: s.score,
    popularity: s.popularity,
    keywordScore: s.keywordScore,
    languageBonus: s.languageBonus,
    matchedKeywords: s.matchedKeywords,
    ...(s.popularityLabel ? { popularityLabel: s.popularityLabel } : {}),
    source: s.r.source,
    publishedAt: s.r.publishedAt,
    fetchedAt,
  }));
}

/**
 * トレンド枠 item のバッジ用ラベル。trending ソースは popularityLabel の prefix 判定
 * (qiita-api: / zenn-api:) に該当しないため専用に組む。HN は生 points を持たないので undefined。
 */
function trendingPopularityLabel(
  source: string,
  raw: number | undefined,
): string | undefined {
  if (!raw || raw <= 0) return undefined;
  if (source === "qiita-trending") return `Qiita LGTM ${raw}`;
  if (source === "zenn-trending") return `Zenn ♥ ${raw}`;
  return undefined;
}

/**
 * 興味タグに無関係でも世間トレンド (Qiita / Zenn / HN trending) で勢いのある item を
 * 「今日のニュース」に追加するセレクタ。`rankNews` の枠とは独立した別レーンで、velocity
 * (popularity ÷ √経過時間) 上位 `n` 件を選ぶ。
 *
 * - `excludeUrls`: 既に news 採用済みの url (curated news との重複を除外。Qiita trending と
 *   Qiita-api の被りなどをここで吸収する)。
 * - `seenIds`: 過去 N 日に出た news id (`store.loadRecentNewsIds`)。返す item は kind "news" なので
 *   翌日以降は自動で seen に入り、同じ話題が連日出続けない (cross-day dedup)。
 *
 * トレンドプールは本文を持たないため `summary` は空 (タイトル + サムネのカードになる)。
 */
export function selectTrendingNews(
  trending: TrendingItem[],
  excludeUrls: Set<string>,
  seenIds: Set<string>,
  n: number,
): BaseItem[] {
  const fetchedAt = new Date().toISOString();
  const seenUrl = new Set<string>();
  const scored = trending
    .map((t) => ({
      t,
      v: velocityScore(t.popularity, t.publishedAt, t.fetchedAt),
    }))
    .filter(({ t, v }) => {
      if (v < NEWS_TRENDING_MIN_VELOCITY) return false;
      if (!t.url || excludeUrls.has(t.url) || seenUrl.has(t.url)) return false;
      if (seenIds.has(hashId(t.url))) return false;
      if (hasNegativeKeyword(t.title, "", NEGATIVE_KEYWORDS)) return false;
      seenUrl.add(t.url);
      return true;
    })
    .sort((a, b) => b.v - a.v)
    .slice(0, n);

  return scored.map(({ t, v }) => ({
    id: hashId(t.url),
    kind: "news",
    title: t.title,
    url: t.url,
    summary: "",
    tags: [TRENDING_TAG, ...t.tags],
    score: v,
    popularity: t.popularity,
    keywordScore: 0,
    languageBonus: 0,
    matchedKeywords: [],
    ...(trendingPopularityLabel(t.source, t.popularityRaw)
      ? { popularityLabel: trendingPopularityLabel(t.source, t.popularityRaw) as string }
      : {}),
    source: t.source,
    publishedAt: t.publishedAt,
    fetchedAt,
  }));
}

export async function rankPapers(
  raw: ArxivPaper[],
  seenPaperIds: Set<string> = new Set(),
): Promise<BaseItem[]> {
  const fetchedAt = new Date().toISOString();

  // 新規投稿のみを採用（cross-listing / replace は除外）— GAS 版で API 検証していた挙動を
  // arXiv RSS の announce_type で代替する。APS は常に "new" なので通過する。
  const newOnly = raw.filter((p) => p.announceType === "new");

  // タイトル単位の重複除外（GAS 版 seen Set と同じ）— arXiv preprint と
  // 同タイトルの APS 出版が両方流れてきた場合、先頭 (= arXiv) を残す。
  const seen = new Set<string>();
  const deduped = newOnly.filter((p) => {
    if (seen.has(p.title)) return false;
    seen.add(p.title);
    return true;
  });

  // 過去 N 日の bundle に出た論文を除外（cross-day dedup）。id は hashId(absUrl)。
  // quantumPool / finalists を組む前に落とすことで、enforceQuantumMin による
  // 「昨日出た量子論文の拾い直し」も塞ぐ。
  const unique = deduped.filter((p) => !seenPaperIds.has(hashId(p.absUrl)));

  // タイトル + abstract で照合 (タイトル一致は scoreFields 内で加重される)。
  // 元の GAS 実装は abstract のみだったが、タイトルにキーワードが入る論文は
  // 強い信号なので採用する。
  const scoredAll: ScoredPaper[] = unique.map((p) => {
    const { score: baseScore, matched } = scoreFields(
      p.title,
      p.abstract,
      PAPER_KEYWORDS,
    );
    // 複数の異なるキーワードに合致した論文（複数テーマに関連＝関連度が高い）を
    // 単一語連投の論文より上へ押し上げる多様性ボーナス。
    const diversityBonus =
      Math.max(0, matched.length - 1) * PAPER_MULTI_MATCH_BONUS;
    const score = baseScore + diversityBonus;
    const haystack = `${p.title} ${p.abstract}`.toLowerCase();
    const priority = PAPER_PRIORITY_KEYWORDS.some((k) =>
      haystack.includes(k.toLowerCase()),
    );
    return { p, score, matched, priority };
  });

  // 優先キーワード → スコア降順 → 投稿日新しい順（GAS 版のソート規則）
  const bySortRule = (a: ScoredPaper, b: ScoredPaper) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    if (a.score !== b.score) return b.score - a.score;
    return b.p.publishedAt.localeCompare(a.p.publishedAt);
  };

  const scored = scoredAll
    .filter((s) => s.score >= PAPER_SCORE_THRESHOLD)
    .sort(bySortRule);

  // quantum は重みづけしないため閾値で落ちうる。最低1本保証用に閾値前から
  // quantum 候補を別プールとして用意する (selectFinalists で補充に使う)。
  const quantumPool = scoredAll
    .filter((s) => isQuantumPaper(s.p))
    .sort(bySortRule);

  const finalists = selectFinalists(scored, quantumPool);

  const summaries = await Promise.all(
    finalists.map(({ p }) => summarizePaper(p.title, p.abstract)),
  );

  return finalists.map(({ p, score, matched }, i) => {
    const canonMatched = canonicalTags(matched);
    // quantum は重みづけ対象外で matched に乗らないため、量子論文には
    // quantum-computing タグを付け直して UI 上のラベルを維持する。
    const tags =
      isQuantumPaper(p) &&
      !canonMatched.includes("quantum-computing") &&
      !canonMatched.includes("quantum-algorithm")
        ? [...canonMatched, "quantum-computing"]
        : canonMatched;
    const r = summaries[i];
    return {
      id: hashId(p.absUrl),
      kind: "paper",
      title: p.title,
      url: p.absUrl,
      summary: r?.summary ?? "",
      ...(r?.struct ? { summaryStruct: r.struct } : {}),
      tags,
      score,
      popularity: 0,
      keywordScore: score,
      languageBonus: 0,
      matchedKeywords: tags,
      source: p.source,
      publishedAt: p.publishedAt,
      fetchedAt,
      ...(p.authors.length > 0 ? { authors: p.authors } : {}),
    };
  });
}
