import { QIITA_TRENDING_MIN_STOCKS, TRENDING_PER_SOURCE } from "../config.js";
import { fetchWithFeedCache, type FeedFetchResult } from "../cache.js";
import { fetchText } from "../util.js";
import type { RawItem } from "./types.js";

const API_BASE = "https://qiita.com/api/v2/items";

interface QiitaTagRef {
  name?: string;
}

interface QiitaItem {
  id?: string;
  title?: string;
  url?: string;
  created_at?: string;
  likes_count?: number;
  stocks_count?: number;
  tags?: QiitaTagRef[];
}

/**
 * site-wide な Qiita 人気記事を取得する (tag フィルタなし)。
 * `query=stocks:>N created:>YYYY-MM-DD` で stocks 閾値 + 期間で絞り、
 * レスポンスに付く likes_count / tags を世間トレンド計測に使う。
 */
export async function fetchQiitaTrending(sinceISO: string): Promise<FeedFetchResult> {
  const sinceDate = sinceISO.slice(0, 10);
  const params = new URLSearchParams({
    page: "1",
    per_page: String(TRENDING_PER_SOURCE),
    query: `stocks:>${QIITA_TRENDING_MIN_STOCKS} created:>${sinceDate}`,
  });
  const url = `${API_BASE}?${params.toString()}`;
  const cutoff = Date.parse(sinceISO);

  return fetchWithFeedCache(
    "qiita-trending",
    "qiita-trending",
    () => fetchText(url, { headers: { accept: "application/json" } }),
    (body) => {
      const json = JSON.parse(body) as QiitaItem[];
      const out: RawItem[] = [];
      for (const it of json) {
        const title = (it.title ?? "").trim();
        const link = (it.url ?? "").trim();
        if (!title || !link) continue;
        const publishedAt = it.created_at ?? new Date().toISOString();
        const t = Date.parse(publishedAt);
        if (Number.isFinite(t) && Number.isFinite(cutoff) && t < cutoff) continue;
        const tags = (it.tags ?? [])
          .map((tag) => (tag?.name ?? "").trim().toLowerCase())
          .filter(Boolean);
        out.push({
          title,
          url: link,
          description: "",
          source: "qiita-trending",
          publishedAt,
          baseScore: it.likes_count ?? 0,
          rawTags: tags,
        });
      }
      return out;
    },
  );
}
