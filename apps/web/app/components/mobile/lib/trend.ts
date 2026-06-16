import type { BaseItem, BigTagGroup, DailyBundle, TrendingItem } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import { bigTagOf, itemBigTags } from "./bigTags";

export type RecapPeriod = 7 | 14 | 30;

export const DELTA_UP = "oklch(0.62 0.15 150)";
export const DELTA_DOWN = "oklch(0.6 0.18 25)";

export function dateRange(latestDate: string, period: number): string[] {
  const out: string[] = [];
  const base = new Date(`${latestDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return out;
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out;
}

export function tagCountsByDate(
  bundles: Record<string, DailyBundle>,
  dates: string[],
  filter?: (it: BaseItem) => boolean,
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (!d) continue;
    for (const it of bundles[d]?.items ?? []) {
      if (filter && !filter(it)) continue;
      for (const t of it.tags) {
        if (t === TRENDING_TAG) continue;
        let arr = out[t];
        if (!arr) {
          arr = new Array<number>(dates.length).fill(0);
          out[t] = arr;
        }
        arr[i] = (arr[i] ?? 0) + 1;
      }
    }
  }
  return out;
}

export function bigTagCountsByDate(
  bundles: Record<string, DailyBundle>,
  dates: string[],
): Record<BigTagGroup, number[]> {
  const out: Record<BigTagGroup, number[]> = {
    language: new Array<number>(dates.length).fill(0),
    ai: new Array<number>(dates.length).fill(0),
    algorithm: new Array<number>(dates.length).fill(0),
    hobby: new Array<number>(dates.length).fill(0),
  };
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (!d) continue;
    for (const it of bundles[d]?.items ?? []) {
      for (const g of itemBigTags(it)) {
        out[g][i] = (out[g][i] ?? 0) + 1;
      }
    }
  }
  return out;
}

export interface RisingTag {
  tag: string;
  recent: number;
  prior: number;
  ratio: number;
  series: number[];
  bigGroup: BigTagGroup | null;
}

export function risingTags(
  bundles: Record<string, DailyBundle>,
  dates: string[],
  opts: {
    minRecent?: number;
    topN?: number;
    filter?: (it: BaseItem) => boolean;
  } = {},
): RisingTag[] {
  const { minRecent = 2, topN = 6, filter } = opts;
  if (dates.length < 2) return [];
  const counts = tagCountsByDate(bundles, dates, filter);
  const splitAt = Math.floor(dates.length / 2);
  const result: RisingTag[] = [];
  for (const [tag, series] of Object.entries(counts)) {
    const prior = series.slice(0, splitAt).reduce((a, b) => a + b, 0);
    const recent = series.slice(splitAt).reduce((a, b) => a + b, 0);
    if (recent < minRecent) continue;
    if (recent <= prior) continue;
    const ratio = (recent + 1) / (prior + 1);
    result.push({ tag, recent, prior, ratio, series, bigGroup: bigTagOf(tag) });
  }
  result.sort((a, b) => b.ratio - a.ratio || b.recent - a.recent);
  return result.slice(0, topN);
}

export interface TagFreqEntry {
  tag: string;
  count: number;
  prevCount: number;
  delta: number;
  isNew: boolean;
  bigGroup: BigTagGroup | null;
}

export function tagFrequency(
  bundles: Record<string, DailyBundle>,
  dates: string[],
  prevDates: string[],
  topN: number,
): TagFreqEntry[] {
  const sum = (ds: string[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const d of ds) {
      for (const it of bundles[d]?.items ?? []) {
        for (const t of it.tags) {
          if (t === TRENDING_TAG) continue;
          m.set(t, (m.get(t) ?? 0) + 1);
        }
      }
    }
    return m;
  };
  const cur = sum(dates);
  const prev = sum(prevDates);
  const entries: TagFreqEntry[] = [];
  for (const [tag, count] of cur) {
    const prevCount = prev.get(tag) ?? 0;
    entries.push({
      tag,
      count,
      prevCount,
      delta: count - prevCount,
      isNew: prevCount === 0 && count > 0,
      bigGroup: bigTagOf(tag),
    });
  }
  entries.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return entries.slice(0, topN);
}

/**
 * トレンド指標 = popularity ÷ √経過時間
 *
 * `popularity` は fetchedAt 時点での正規化された人気指標 (Qiita LGTM / Zenn ♥ / HN points)。
 * 発行 (publishedAt) から fetchedAt までの経過時間が短いほど「短時間で多くの favorite を集めた」
 * = 勢いがあるとみなし、ageHours の平方根で割って velocity 寄りのランキング指標にする。
 *
 * - 4h あたりを基準 (係数 sqrt(8/(4+4)) = 1.0) として
 * - 24h: ×0.53 / 48h: ×0.39 / 1h: ×1.26
 * publishedAt / fetchedAt が無効な場合は popularity をそのまま返す。
 */
export function velocityScore(
  popularity: number,
  publishedAt: string,
  fetchedAt: string,
): number {
  if (popularity <= 0) return 0;
  const pub = Date.parse(publishedAt);
  const fetched = Date.parse(fetchedAt);
  if (!Number.isFinite(pub) || !Number.isFinite(fetched) || fetched <= pub) {
    return popularity;
  }
  const ageHours = Math.max(1, (fetched - pub) / 3_600_000);
  const factor = Math.sqrt(8 / (ageHours + 4));
  return Math.round(popularity * factor);
}

export function trendScore(item: BaseItem): number {
  return velocityScore(item.popularity ?? 0, item.publishedAt, item.fetchedAt);
}

export interface TrendTagEntry {
  tag: string;
  /** trendScore の合計 (トレンド総量) */
  trendSum: number;
  /** 該当 item 件数 */
  count: number;
  /** 1 item あたりの平均トレンド指標 */
  avg: number;
  bigGroup: BigTagGroup | null;
}

/**
 * site-wide 週間トレンド (bundle.trending) を元に集計するトレンドタグ。
 * ユーザー興味で絞り込んでいない Qiita / Zenn の生タグを使うため、世間のトレンドに近い。
 * trending データが無い bundle (2026-05-22 以前) は単純にスキップする。
 */
export function worldTrendTags(
  bundles: Record<string, DailyBundle>,
  dates: string[],
  topN: number,
): TrendTagEntry[] {
  const trendSum = new Map<string, number>();
  const count = new Map<string, number>();
  for (const d of dates) {
    const trending: TrendingItem[] = bundles[d]?.trending ?? [];
    for (const it of trending) {
      const t = velocityScore(it.popularity, it.publishedAt, it.fetchedAt);
      if (t <= 0) continue;
      for (const tag of it.tags) {
        trendSum.set(tag, (trendSum.get(tag) ?? 0) + t);
        count.set(tag, (count.get(tag) ?? 0) + 1);
      }
    }
  }
  const entries: TrendTagEntry[] = [];
  for (const [tag, sum] of trendSum) {
    const n = count.get(tag) ?? 0;
    entries.push({
      tag,
      trendSum: sum,
      count: n,
      avg: n > 0 ? sum / n : 0,
      bigGroup: bigTagOf(tag),
    });
  }
  entries.sort((a, b) => b.trendSum - a.trendSum || b.count - a.count);
  return entries.slice(0, topN);
}
