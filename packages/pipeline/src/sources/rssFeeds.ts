import Parser from "rss-parser";
import { isFresh, readFeedCache, writeFeedCache } from "../cache.js";
import type { RawItem } from "./types.js";

const parser = new Parser();
const USER_AGENT = "daily-news-bot/0.1 (+https://github.com/)";
const FETCH_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [500, 2000];

/**
 * 1 回の HTTP fetch + AbortController によるタイムアウト。
 */
async function fetchOnce(
  url: string,
  headers: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { "user-agent": USER_AGENT, ...headers },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 失敗したら指数バックオフで最大 RETRY_DELAYS_MS.length 回リトライ。
 * 304 / 200 はそのまま、5xx と例外はリトライ対象、4xx はリトライせず即座に投げる。
 */
async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetchOnce(url, headers);
      if (res.status >= 500) {
        lastErr = new Error(`http ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      lastErr = err;
    }
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay !== undefined) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

interface ParsedItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  pubDate?: string;
}

function toRawItems(
  items: ParsedItem[],
  id: string,
  baseScore: number,
): RawItem[] {
  return items.map((item) => ({
    title: item.title ?? "",
    url: item.link ?? "",
    description: (item.contentSnippet ?? item.content ?? "").slice(0, 500),
    source: `rss:${id}`,
    publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
    baseScore,
  }));
}

/**
 * 戻り値の `cached` フラグは呼び出し側 (main.ts の safe()) で
 * 健全性ログの status 判定に使われる。
 *  - cached: true     => 304 Not Modified、または失敗 → last-good フォールバック
 *  - cached: false    => 200 OK で新規パース
 */
export interface FeedFetchResult {
  items: RawItem[];
  cached: boolean;
}

export async function fetchRssFeed(
  id: string,
  url: string,
  baseScore = 0,
): Promise<FeedFetchResult> {
  const prior = await readFeedCache(id);
  const headers: Record<string, string> = { accept: "application/rss+xml,application/xml,*/*" };
  if (prior?.etag) headers["if-none-match"] = prior.etag;
  if (prior?.lastModified) headers["if-modified-since"] = prior.lastModified;

  let res: Response;
  try {
    res = await fetchWithRetry(url, headers);
  } catch (err) {
    if (prior && isFresh(prior)) {
      console.warn(
        `[rss] ${id} fetch failed (${(err as Error).message}); using last-good cache`,
      );
      return { items: prior.items, cached: true };
    }
    throw err;
  }

  if (res.status === 304 && prior) {
    return { items: prior.items, cached: true };
  }

  if (!res.ok) {
    if (prior && isFresh(prior)) {
      console.warn(`[rss] ${id} http ${res.status}; using last-good cache`);
      return { items: prior.items, cached: true };
    }
    throw new Error(`fetch ${url} -> ${res.status}`);
  }

  const xml = await res.text();
  const feed = await parser.parseString(xml);
  const items = toRawItems((feed.items ?? []) as ParsedItem[], id, baseScore);

  await writeFeedCache(id, {
    etag: res.headers.get("etag") ?? undefined,
    lastModified: res.headers.get("last-modified") ?? undefined,
    items,
    fetchedAt: new Date().toISOString(),
  });

  return { items, cached: false };
}
