import Parser from "rss-parser";
import type { RawItem } from "./types.js";

const parser = new Parser({
  headers: { "user-agent": "daily-news-bot/0.1" },
});

export async function fetchRssFeed(
  id: string,
  url: string,
  baseScore = 0,
): Promise<RawItem[]> {
  const feed = await parser.parseURL(url);
  return (feed.items ?? []).map((item) => ({
    title: item.title ?? "",
    url: item.link ?? "",
    description: (item.contentSnippet ?? item.content ?? "").slice(0, 500),
    source: `rss:${id}`,
    publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
    baseScore,
  }));
}
