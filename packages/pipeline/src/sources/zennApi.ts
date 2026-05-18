import { fetchWithFeedCache, type FeedFetchResult } from "../cache.js";
import { fetchText } from "../util.js";
import type { RawItem } from "./types.js";

const API_BASE = "https://zenn.dev/api/articles";

interface ZennArticle {
  id?: number;
  title?: string;
  slug?: string;
  path?: string;
  published_at?: string;
  liked_count?: number;
  body_letters_count?: number;
}

interface ZennListResponse {
  articles?: ZennArticle[];
}

export async function fetchZennTopic(
  topic: string,
  sinceISO: string,
): Promise<FeedFetchResult> {
  const cacheId = `zenn-api_${topic.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const params = new URLSearchParams({
    order: "liked_count",
    topicname: topic,
    page: "1",
  });
  const url = `${API_BASE}?${params.toString()}`;
  const cutoff = Date.parse(sinceISO);

  return fetchWithFeedCache(
    cacheId,
    `zenn-api:${topic}`,
    () => fetchText(url, { headers: { accept: "application/json" } }),
    (body) => {
      const json = JSON.parse(body) as ZennListResponse;
      const articles = json.articles ?? [];
      const items: RawItem[] = [];
      for (const a of articles) {
        const title = (a.title ?? "").trim();
        const path = (a.path ?? "").trim();
        if (!title || !path) continue;
        const publishedAt = a.published_at ?? new Date().toISOString();
        const t = Date.parse(publishedAt);
        if (Number.isFinite(t) && Number.isFinite(cutoff) && t < cutoff) continue;
        items.push({
          title,
          url: `https://zenn.dev${path}`,
          description: "",
          source: `zenn-api:${topic}`,
          publishedAt,
          baseScore: a.liked_count ?? 0,
        });
      }
      return items;
    },
  );
}
