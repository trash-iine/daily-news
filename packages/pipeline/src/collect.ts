import type { TrendingItem } from "@daily-news/shared";
import {
  APS_FEEDS,
  APS_PAPER_MAX_AGE_DAYS,
  ARXIV_CATEGORIES,
  ARXIV_MAX_AGE_DAYS,
  HN_QUERIES,
  NEWS_MAX_AGE_HOURS,
  QIITA_API_TAGS,
  RSS_FEEDS,
  TRENDING_LOOKBACK_HOURS,
  ZENN_API_TOPICS,
} from "./config.js";
import { appendHealth } from "./cache.js";
import { canonicalTags, popularityScore } from "./scoreModel.js";
import { fetchArxivCategory, type ArxivPaper } from "./sources/arxiv.js";
import { fetchAPSFeed } from "./sources/physicalReview.js";
import { fetchHackerNewsQuery } from "./sources/hackerNews.js";
import { fetchHnTrending } from "./sources/hnTrending.js";
import { fetchQiitaTag } from "./sources/qiitaApi.js";
import { fetchQiitaTrending } from "./sources/qiitaTrending.js";
import { fetchRssFeed, type FeedFetchResult } from "./sources/rssFeeds.js";
import { fetchZennTopic } from "./sources/zennApi.js";
import { fetchZennTrending } from "./sources/zennTrending.js";
import type { RawItem } from "./sources/types.js";

async function safe<T>(label: string, p: Promise<T[]>): Promise<T[]> {
  try {
    return await p;
  } catch (err) {
    console.warn(`[source] ${label} failed:`, (err as Error).message);
    return [];
  }
}

/**
 * フィード取得を try で包み、健全性ログ (data/.cache/health.log) に
 * status / count / ms を JSON Lines で追記する。
 * 失敗時は空配列を返してパイプライン全体を続行させる。
 */
async function safeFeed(
  id: string,
  fn: () => Promise<FeedFetchResult>,
): Promise<RawItem[]> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    await appendHealth({
      ts: new Date().toISOString(),
      id,
      status: result.cached ? "cached" : "ok",
      count: result.items.length,
      ms: Date.now() - startedAt,
    });
    return result.items;
  } catch (err) {
    const message = (err as Error).message;
    console.warn(`[source] ${id} failed:`, message);
    await appendHealth({
      ts: new Date().toISOString(),
      id,
      status: "failed",
      count: 0,
      ms: Date.now() - startedAt,
      error: message,
    });
    return [];
  }
}

export async function collectNews(): Promise<RawItem[]> {
  const sinceISO = new Date(
    Date.now() - NEWS_MAX_AGE_HOURS * 3600 * 1000,
  ).toISOString();
  const rssTasks = RSS_FEEDS.map((f) =>
    safeFeed(`rss:${f.id}`, () => fetchRssFeed(f.id, f.url, f.baseScore ?? 0)),
  );
  const qiitaTasks = QIITA_API_TAGS.map((t) =>
    safeFeed(`qiita-api:${t}`, () => fetchQiitaTag(t, sinceISO)),
  );
  const zennTasks = ZENN_API_TOPICS.map((t) =>
    safeFeed(`zenn-api:${t}`, () => fetchZennTopic(t, sinceISO)),
  );
  const hnTasks = HN_QUERIES.map((q) =>
    safeFeed(`hn:${q}`, () => fetchHackerNewsQuery(q)),
  );
  const all = await Promise.all([
    ...rssTasks,
    ...qiitaTasks,
    ...zennTasks,
    ...hnTasks,
  ]);
  return all.flat();
}

export async function collectTrending(): Promise<TrendingItem[]> {
  const sinceISO = new Date(
    Date.now() - TRENDING_LOOKBACK_HOURS * 3600 * 1000,
  ).toISOString();
  const fetchedAt = new Date().toISOString();
  const tasks: Array<Promise<RawItem[]>> = [
    safeFeed("qiita-trending", () => fetchQiitaTrending(sinceISO)),
    safeFeed("zenn-trending", () => fetchZennTrending(sinceISO)),
    safeFeed("hn-trending", () => fetchHnTrending()),
  ];
  const batches = await Promise.all(tasks);
  const out: TrendingItem[] = [];
  for (const batch of batches) {
    for (const r of batch) {
      const rawScore = r.baseScore ?? 0;
      const popularity = popularityScore(r.source, rawScore);
      const tags = canonicalTags(r.rawTags ?? []);
      const item: TrendingItem = {
        source: r.source,
        title: r.title,
        url: r.url,
        publishedAt: r.publishedAt,
        fetchedAt,
        popularity,
        tags,
        ...(rawScore > 0 ? { popularityRaw: rawScore } : {}),
      };
      out.push(item);
    }
  }
  return out;
}

const ARXIV_REQUEST_INTERVAL_MS = 3000;

export async function collectPapers(): Promise<ArxivPaper[]> {
  // arXiv API ToU: "no more than one request every three seconds, and limit
  // requests to a single connection at a time" — 7 カテゴリを逐次取得する。
  const out: ArxivPaper[] = [];
  for (let i = 0; i < ARXIV_CATEGORIES.length; i++) {
    const c = ARXIV_CATEGORIES[i] as string;
    const items = await safe(
      `arxiv:${c}`,
      fetchArxivCategory(c, ARXIV_MAX_AGE_DAYS),
    );
    out.push(...items);
    if (i < ARXIV_CATEGORIES.length - 1) {
      await new Promise((r) => setTimeout(r, ARXIV_REQUEST_INTERVAL_MS));
    }
  }
  // APS (Physical Review) RSS は feeds.aps.org の syndication 用エンドポイント。
  // rate-limit の公開規定はないので 5 件を並列 fetch する。
  const apsBatches = await Promise.all(
    APS_FEEDS.map((f) =>
      safe(
        `aps:${f.id}`,
        fetchAPSFeed(f.id, f.url, {
          quantumOnly: f.quantumOnly,
          maxAgeDays: APS_PAPER_MAX_AGE_DAYS,
        }),
      ),
    ),
  );
  for (const batch of apsBatches) out.push(...batch);
  return out;
}
