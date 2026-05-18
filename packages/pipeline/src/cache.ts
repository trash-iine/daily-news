import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RawItem } from "./sources/types.js";

const here = dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = join(here, "..", "..", "..", "data", ".cache");
export const FEED_CACHE_DIR = join(CACHE_DIR, "feeds");
export const HEALTH_LOG_PATH = join(CACHE_DIR, "health.log");

export interface FeedCacheEntry {
  etag?: string;
  lastModified?: string;
  items: RawItem[];
  fetchedAt: string;
}

const MAX_LAST_GOOD_AGE_MS = 7 * 24 * 3600 * 1000;

function feedCachePath(id: string): string {
  // `:` や `/` を含む id にも対応 (現状は使われないが安全側に倒す)
  const safe = id.replace(/[^A-Za-z0-9._-]/g, "_");
  return join(FEED_CACHE_DIR, `${safe}.json`);
}

export async function readFeedCache(id: string): Promise<FeedCacheEntry | null> {
  try {
    const raw = await readFile(feedCachePath(id), "utf-8");
    return JSON.parse(raw) as FeedCacheEntry;
  } catch {
    return null;
  }
}

export async function writeFeedCache(
  id: string,
  entry: FeedCacheEntry,
): Promise<void> {
  await mkdir(FEED_CACHE_DIR, { recursive: true });
  await writeFile(feedCachePath(id), JSON.stringify(entry), "utf-8");
}

/**
 * cache.fetchedAt が 7 日より古ければ stale。
 * stale なキャッシュは last-good フォールバックに使わない。
 */
export function isFresh(entry: FeedCacheEntry): boolean {
  const t = Date.parse(entry.fetchedAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < MAX_LAST_GOOD_AGE_MS;
}

export type FeedHealthStatus = "ok" | "cached" | "failed";

export interface FeedHealthRecord {
  ts: string;
  id: string;
  status: FeedHealthStatus;
  count: number;
  ms: number;
  error?: string;
}

export async function appendHealth(record: FeedHealthRecord): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await appendFile(HEALTH_LOG_PATH, JSON.stringify(record) + "\n", "utf-8");
}

export interface FeedFetchResult {
  items: RawItem[];
  cached: boolean;
}

/**
 * 「外部 API を 1 回叩いてレスポンスをパースし、結果をキャッシュに書き戻す」
 * 共通フロー。fetch が失敗したら直近のキャッシュ (7 日以内) にフォールバックする。
 */
export async function fetchWithFeedCache(
  cacheId: string,
  label: string,
  fetcher: () => Promise<string>,
  parse: (body: string) => RawItem[],
): Promise<FeedFetchResult> {
  let body: string;
  try {
    body = await fetcher();
  } catch (err) {
    const prior = await readFeedCache(cacheId);
    if (prior && isFresh(prior)) {
      console.warn(
        `[${label}] fetch failed (${(err as Error).message}); using last-good cache`,
      );
      return { items: prior.items, cached: true };
    }
    throw err;
  }

  const items = parse(body);
  await writeFeedCache(cacheId, { items, fetchedAt: new Date().toISOString() });
  return { items, cached: false };
}
