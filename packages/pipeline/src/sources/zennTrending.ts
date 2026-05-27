import { TRENDING_PER_SOURCE } from "../config.js";
import { fetchWithFeedCache, type FeedFetchResult } from "../cache.js";
import { fetchText } from "../util.js";
import { parseJsonOr } from "./popularity.js";
import type { RawItem } from "./types.js";

const API_BASE = "https://zenn.dev/api/articles";

interface ZennTopicRef {
  name?: string;
  display_name?: string;
}

interface ZennArticle {
  id?: number;
  title?: string;
  path?: string;
  published_at?: string;
  liked_count?: number;
  topics?: ZennTopicRef[];
}

interface ZennListResponse {
  articles?: ZennArticle[];
}

/**
 * site-wide な Zenn 人気記事を取得する (topicname フィルタなし)。
 * `order=liked_count` で全体上位を順位付け、`liked_count` を世間トレンド計測に使う。
 * 一覧 API レスポンスに `topics[]` が含まれない場合は `rawTags` を空配列で返す
 * (記事個別 GET の N+1 化は Zenn 非公式 API への負荷を考えて見送り)。
 */
export async function fetchZennTrending(sinceISO: string): Promise<FeedFetchResult> {
  const params = new URLSearchParams({
    order: "liked_count",
    page: "1",
  });
  const url = `${API_BASE}?${params.toString()}`;
  const cutoff = Date.parse(sinceISO);

  return fetchWithFeedCache(
    "zenn-trending",
    "zenn-trending",
    () => fetchText(url, { headers: { accept: "application/json" } }),
    (body) => {
      const json = parseJsonOr<ZennListResponse>(body, "zenn-trending");
      const articles = json.articles ?? [];
      const out: RawItem[] = [];
      for (const a of articles.slice(0, TRENDING_PER_SOURCE)) {
        const title = (a.title ?? "").trim();
        const path = (a.path ?? "").trim();
        if (!title || !path) continue;
        const publishedAt = a.published_at ?? new Date().toISOString();
        const t = Date.parse(publishedAt);
        if (Number.isFinite(t) && Number.isFinite(cutoff) && t < cutoff) continue;
        const tags = (a.topics ?? [])
          .map((topic) => (topic?.name ?? topic?.display_name ?? "").trim().toLowerCase())
          .filter(Boolean);
        out.push({
          title,
          url: `https://zenn.dev${path}`,
          description: "",
          source: "zenn-trending",
          publishedAt,
          baseScore: a.liked_count ?? 0,
          rawTags: tags,
        });
      }
      return out;
    },
  );
}
