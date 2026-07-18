import {
  BIG_TAG_GROUPS,
  LANGUAGE_BONUS,
  RSS_FEEDS,
  TAG_ALIASES,
} from "./config.js";
import { pointsToBaseScore } from "./sources/popularity.js";

export function canonicalTags(matched: string[]): string[] {
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

export function isPopularityOnly(source: string): boolean {
  return source.startsWith("qiita-api:") || source.startsWith("zenn-api:");
}

export function tagsFromSource(source: string): string[] {
  const m = /^(?:qiita-api|zenn-api):(.+)$/.exec(source);
  if (!m) return [];
  return canonicalTags([m[1] as string]);
}

/**
 * rss:<id> ソースの feed 設定 defaultTags を返す。キーワード非一致の記事にも
 * ソース単位で canonical タグを付与し、big-tag 関門 (primaryGroup) を通すための機構。
 */
export function defaultTagsFromSource(source: string): string[] {
  if (!source.startsWith("rss:")) return [];
  const id = source.slice(4);
  return RSS_FEEDS.find((f) => f.id === id)?.defaultTags ?? [];
}

/**
 * 各ソースの人気指標 (Qiita LGTM / Zenn いいね / HN points / RSS baseScore) を
 * 共通レンジに正規化する。
 * - Qiita / Zenn は生 likes_count を sqrt スケール (3 * sqrt) で 0〜30 程度に圧縮
 * - HN は sources/hackerNews.ts:pointsToBaseScore で既に sqrt 正規化済み (cap 15)
 * - hn-trending は生 points を保存しているので同じ pointsToBaseScore を再適用
 * - RSS の baseScore はフィード重みなのでそのまま使う
 */
export function popularityScore(source: string, baseScore: number): number {
  if (baseScore <= 0) return 0;
  if (
    source.startsWith("qiita-api:") ||
    source.startsWith("zenn-api:") ||
    source === "qiita-trending" ||
    source === "zenn-trending"
  ) {
    return Math.round(3 * Math.sqrt(baseScore));
  }
  if (source === "hn-trending") {
    return pointsToBaseScore(baseScore);
  }
  return baseScore;
}

/**
 * バッジ表示用の生値ラベル。Qiita / Zenn は baseScore が生 LGTM/いいね 数なのでそのまま使う。
 * HN は baseScore が pointsToBaseScore で既に正規化済みなので生 points を復元できず undefined。
 * RSS は baseScore がフィード重みなので意味のあるラベルにならず undefined。
 */
export function popularityLabel(source: string, baseScore: number): string | undefined {
  if (baseScore <= 0) return undefined;
  if (source.startsWith("qiita-api:")) return `Qiita LGTM ${baseScore}`;
  if (source.startsWith("zenn-api:")) return `Zenn ♥ ${baseScore}`;
  return undefined;
}

export function primaryGroup(tags: string[]): string | undefined {
  for (const t of tags) {
    const g = BIG_TAG_GROUPS[t];
    if (g) return g;
  }
  return undefined;
}

/**
 * source 文字列から言語/重要度の tier を返す。
 * 0 = 日本語、1 = 英語の重要/低頻度ソース、2 = それ以外の英語 (HN 等)。
 * RSS_FEEDS に lang/important を持たせ、Qiita/Zenn/HN は prefix で判定する。
 */
export function sourceTier(source: string): 0 | 1 | 2 {
  if (source.startsWith("qiita-api:") || source.startsWith("zenn-api:")) return 0;
  if (source.startsWith("hn:")) return 2;
  if (source.startsWith("rss:")) {
    const id = source.slice(4);
    const feed = RSS_FEEDS.find((f) => f.id === id);
    if (!feed) return 2;
    if (feed.lang === "ja") return 0;
    return feed.important ? 1 : 2;
  }
  return 2;
}

export function languageBonus(source: string): number {
  return LANGUAGE_BONUS[sourceTier(source)];
}

/**
 * トレンド指標 = popularity ÷ √経過時間。
 * web 側 (apps/web/.../lib/trend.ts:velocityScore) と同一ロジックの pipeline 用コピー
 * (web は app 配下のため import 不可)。発行 (publishedAt) から fetchedAt までが短いほど
 * 「短時間で多くの favorite を集めた = 勢いがある」とみなす。4h を基準 (factor 1.0)、
 * 24h ×0.53 / 48h ×0.39 / 1h ×1.26。publishedAt / fetchedAt が無効なら popularity をそのまま返す。
 */
export function velocityScore(
  popularity: number,
  publishedAt: string,
  fetchedAt: string,
): number {
  if (popularity <= 0) return 0;
  const pub = Date.parse(publishedAt);
  const fetched = Date.parse(fetchedAt);
  if (!Number.isFinite(pub) || !Number.isFinite(fetched) || fetched <= pub) {
    return popularity;
  }
  const ageHours = Math.max(1, (fetched - pub) / 3_600_000);
  const factor = Math.sqrt(8 / (ageHours + 4));
  return Math.round(popularity * factor);
}
