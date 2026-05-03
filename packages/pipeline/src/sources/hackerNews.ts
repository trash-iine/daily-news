import { NEWS_MAX_AGE_HOURS } from "../config.js";
import { cleanText, fetchText } from "../util.js";
import type { FeedFetchResult } from "./rssFeeds.js";
import type { RawItem } from "./types.js";

interface HnHit {
  objectID: string;
  title?: string | null;
  url?: string | null;
  story_text?: string | null;
  points?: number | null;
  created_at_i?: number | null;
}

interface HnResponse {
  hits?: HnHit[];
}

const SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date";
const HITS_PER_PAGE = 30;

/**
 * HN の points を baseScore に折り込む。
 * sub-linear (sqrt) スケールで、低 points も拾いつつ高 points で頭打ち。
 *   10pt -> 6, 50pt -> 14, 100pt+ -> 15
 * lookback を 7 日に伸ばした分、高 points のロングテールを浮かせるため上限を 15 まで広げる
 * (Qiita LGTM / Zenn いいねの上限と揃える)。
 */
function pointsToBaseScore(points: number | null | undefined): number {
  if (!points || points <= 0) return 0;
  return Math.min(15, Math.round(2 * Math.sqrt(points)));
}

export async function fetchHackerNewsQuery(
  query: string,
): Promise<FeedFetchResult> {
  const cutoffSec = Math.floor((Date.now() - NEWS_MAX_AGE_HOURS * 3600 * 1000) / 1000);
  const params = new URLSearchParams({
    query,
    tags: "story",
    hitsPerPage: String(HITS_PER_PAGE),
    numericFilters: `created_at_i>=${cutoffSec}`,
  });
  const url = `${SEARCH_URL}?${params.toString()}`;
  const body = await fetchText(url);
  const json = JSON.parse(body) as HnResponse;
  const hits = json.hits ?? [];

  const out: RawItem[] = [];
  for (const h of hits) {
    const title = (h.title ?? "").trim();
    if (!title) continue;
    const link =
      (h.url ?? "").trim() ||
      `https://news.ycombinator.com/item?id=${h.objectID}`;
    const created = h.created_at_i;
    const publishedAt =
      typeof created === "number"
        ? new Date(created * 1000).toISOString()
        : new Date().toISOString();
    out.push({
      title,
      url: link,
      description: cleanText(h.story_text ?? "").slice(0, 500),
      source: `hn:${query}`,
      publishedAt,
      baseScore: pointsToBaseScore(h.points),
    });
  }
  return { items: out, cached: false };
}
