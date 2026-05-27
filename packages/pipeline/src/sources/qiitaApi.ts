import { fetchWithFeedCache, type FeedFetchResult } from "../cache.js";
import { cleanText, fetchText } from "../util.js";
import { parseJsonOr } from "./popularity.js";
import type { RawItem } from "./types.js";

const API_BASE = "https://qiita.com/api/v2/items";
const PER_PAGE = 40;

interface QiitaItem {
  id?: string;
  title?: string;
  url?: string;
  body?: string;
  created_at?: string;
  likes_count?: number;
  stocks_count?: number;
}

export async function fetchQiitaTag(
  tag: string,
  sinceISO: string,
): Promise<FeedFetchResult> {
  const cacheId = `qiita-api_${tag.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const sinceDate = sinceISO.slice(0, 10);
  const params = new URLSearchParams({
    page: "1",
    per_page: String(PER_PAGE),
    query: `tag:${tag} created:>${sinceDate}`,
  });
  const url = `${API_BASE}?${params.toString()}`;
  const cutoff = Date.parse(sinceISO);

  return fetchWithFeedCache(
    cacheId,
    `qiita-api:${tag}`,
    () => fetchText(url, { headers: { accept: "application/json" } }),
    (body) => {
      const json = parseJsonOr<QiitaItem[]>(body, `qiita-api:${tag}`);
      const items: RawItem[] = [];
      for (const it of json) {
        const title = (it.title ?? "").trim();
        const link = (it.url ?? "").trim();
        if (!title || !link) continue;
        const publishedAt = it.created_at ?? new Date().toISOString();
        const t = Date.parse(publishedAt);
        if (Number.isFinite(t) && Number.isFinite(cutoff) && t < cutoff) continue;
        items.push({
          title,
          url: link,
          description: cleanText(it.body ?? "").slice(0, 500),
          source: `qiita-api:${tag}`,
          publishedAt,
          baseScore: it.likes_count ?? 0,
        });
      }
      return items;
    },
  );
}
