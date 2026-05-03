import { isFresh, readFeedCache, writeFeedCache } from "../cache.js";
import { cleanText, fetchText } from "../util.js";
import type { FeedFetchResult } from "./rssFeeds.js";
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

/**
 * likes_count を baseScore に変換。Qiita の LGTM スケールは Zenn より小さい (5 LGTM で人気枠) ので /5。
 * HN points と同じ枠 (0..15) に収める。
 */
function likesToBaseScore(likes: number | null | undefined): number {
  if (!likes || likes <= 0) return 0;
  return Math.min(15, Math.floor(likes / 5));
}

function toDateOnly(iso: string): string {
  // "2026-04-26T00:00:00.000Z" -> "2026-04-26"
  return iso.slice(0, 10);
}

export async function fetchQiitaTag(
  tag: string,
  sinceISO: string,
): Promise<FeedFetchResult> {
  const cacheId = `qiita-api_${tag.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const sinceDate = toDateOnly(sinceISO);
  const params = new URLSearchParams({
    page: "1",
    per_page: String(PER_PAGE),
    query: `tag:${tag} created:>${sinceDate}`,
  });
  const url = `${API_BASE}?${params.toString()}`;

  let body: string;
  try {
    body = await fetchText(url, { headers: { accept: "application/json" } });
  } catch (err) {
    const prior = await readFeedCache(cacheId);
    if (prior && isFresh(prior)) {
      console.warn(
        `[qiita-api] ${tag} fetch failed (${(err as Error).message}); using last-good cache`,
      );
      return { items: prior.items, cached: true };
    }
    throw err;
  }

  const json = JSON.parse(body) as QiitaItem[];
  const cutoff = Date.parse(sinceISO);
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
      baseScore: likesToBaseScore(it.likes_count),
    });
  }

  await writeFeedCache(cacheId, {
    items,
    fetchedAt: new Date().toISOString(),
  });

  return { items, cached: false };
}
