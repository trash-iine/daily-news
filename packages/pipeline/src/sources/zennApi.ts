import { isFresh, readFeedCache, writeFeedCache } from "../cache.js";
import { fetchText } from "../util.js";
import type { FeedFetchResult } from "./rssFeeds.js";
import type { RawItem } from "./types.js";

const API_BASE = "https://zenn.dev/api/articles";
const COUNT = 48;

interface ZennArticle {
  title?: string;
  slug?: string;
  path?: string;
  published_at?: string;
  liked_count?: number;
  user?: { username?: string };
}

interface ZennResponse {
  articles?: ZennArticle[];
}

/**
 * liked_count を baseScore に変換。Zenn の like スケールは Qiita より大きい (50 like で人気枠) ので /10。
 * HN points / Qiita LGTM と同じ枠 (0..15) に収める。
 */
function likesToBaseScore(likes: number | null | undefined): number {
  if (!likes || likes <= 0) return 0;
  return Math.min(15, Math.floor(likes / 10));
}

export async function fetchZennTopic(
  topic: string,
  sinceISO: string,
): Promise<FeedFetchResult> {
  const cacheId = `zenn-api_${topic.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const params = new URLSearchParams({
    topicname: topic,
    order: "latest",
    count: String(COUNT),
  });
  const url = `${API_BASE}?${params.toString()}`;

  let body: string;
  try {
    body = await fetchText(url, { headers: { accept: "application/json" } });
  } catch (err) {
    const prior = await readFeedCache(cacheId);
    if (prior && isFresh(prior)) {
      console.warn(
        `[zenn-api] ${topic} fetch failed (${(err as Error).message}); using last-good cache`,
      );
      return { items: prior.items, cached: true };
    }
    throw err;
  }

  const json = JSON.parse(body) as ZennResponse;
  const articles = json.articles ?? [];
  const cutoff = Date.parse(sinceISO);
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
      // Zenn API は body を返さないので、トピック名を description に注入してスコアリングを助ける
      // (KEYWORD_WEIGHTS のキーと一致するトピックは title 不一致でも threshold を超えるようになる)。
      description: topic,
      url: `https://zenn.dev${path}`,
      source: `zenn-api:${topic}`,
      publishedAt,
      baseScore: likesToBaseScore(a.liked_count),
    });
  }

  await writeFeedCache(cacheId, {
    items,
    fetchedAt: new Date().toISOString(),
  });

  return { items, cached: false };
}
