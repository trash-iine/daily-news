import { TRENDING_LOOKBACK_HOURS, TRENDING_PER_SOURCE } from "../config.js";
import { fetchWithFeedCache, type FeedFetchResult } from "../cache.js";
import { fetchText } from "../util.js";
import type { RawItem } from "./types.js";

interface HnHit {
  objectID: string;
  title?: string | null;
  url?: string | null;
  points?: number | null;
  created_at_i?: number | null;
}

interface HnResponse {
  hits?: HnHit[];
}

/**
 * site-wide な HN 人気 story を取得する (キーワードクエリなし)。
 * Algolia の `/api/v1/search` は relevance / popularity 順 (HN は points 基準) で返す。
 * HN 記事自体にタグは無いので `rawTags` は空配列固定。トレンドタグ集計には寄与しないが、
 * 将来の「ソース横断 top items」表示用にデータは保存しておく。
 */
export async function fetchHnTrending(): Promise<FeedFetchResult> {
  const cutoffSec = Math.floor((Date.now() - TRENDING_LOOKBACK_HOURS * 3600 * 1000) / 1000);
  const params = new URLSearchParams({
    tags: "story",
    hitsPerPage: String(TRENDING_PER_SOURCE),
    numericFilters: `created_at_i>=${cutoffSec}`,
  });
  const url = `https://hn.algolia.com/api/v1/search?${params.toString()}`;

  return fetchWithFeedCache(
    "hn-trending",
    "hn-trending",
    () => fetchText(url),
    (body) => {
      const json = JSON.parse(body) as HnResponse;
      const hits = json.hits ?? [];
      const out: RawItem[] = [];
      for (const h of hits) {
        const title = (h.title ?? "").trim();
        if (!title) continue;
        const link =
          (h.url ?? "").trim() || `https://news.ycombinator.com/item?id=${h.objectID}`;
        const created = h.created_at_i;
        const publishedAt =
          typeof created === "number"
            ? new Date(created * 1000).toISOString()
            : new Date().toISOString();
        out.push({
          title,
          url: link,
          description: "",
          source: "hn-trending",
          publishedAt,
          baseScore: h.points ?? 0,
          rawTags: [],
        });
      }
      return out;
    },
  );
}
