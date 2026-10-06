import { cache } from "react";
import type { BaseItem, BigTagGroup } from "@daily-news/shared";
import { getWindow, memoByKey } from "./data";
import { BIG_TAGS, itemBigTags } from "@/app/components/shared/lib/bigTags";
import { bundleCounts } from "@/app/components/shared/lib/bundle";
import {
  bigTagCountsByDate,
  dateRange,
  RECAP_PERIODS,
  type RecapPeriod,
  risingTags,
  tagCountsByDate,
  tagFrequency,
  trendScore,
  worldTrendTags,
} from "@/app/components/shared/lib/trend";

/** Recap の窓幅。period 30 の prevDates が 30 日前まで遡るので 30 × 2。 */
const RECAP_WINDOW_DAYS = 60;

/**
 * Recap が代表記事の描画に実際に使うフィールドだけの射影。
 * `thumbnail` は items サイズの約半分、`summary` / `summaryStruct` で更に 1/4 を占めるので
 * ペイロードには載せない。
 */
export type RecapItem = Pick<
  BaseItem,
  | "id"
  | "url"
  | "title"
  | "tags"
  | "source"
  | "publishedAt"
  | "fetchedAt"
  | "popularity"
  | "popularityLabel"
>;

export interface RecapTagRow {
  tag: string;
  bigGroup: BigTagGroup | null;
  count: number;
  delta: number;
  isNew: boolean;
  series: number[];
  ratio: number;
  worldSum: number;
}

export interface RecapGroup {
  id: BigTagGroup;
  /** 期間内でこの大タグに属する item 数 (論文含む)。 */
  n: number;
  /** 日ごとの件数 (Spark 用、古い→新しい)。 */
  counts: number[];
  /** トレンド指標上位 3 件 (ニュースのみ)。 */
  top: RecapItem[];
}

export interface RecapPeriodData {
  firstDate: string;
  lastDate: string;
  totals: { items: number; papers: number; news: number };
  tagRows: RecapTagRow[];
  groups: RecapGroup[];
  best: RecapItem[];
}

/** period ごとの集計結果。キーは RSC 直列化後は "7" / "14" / "30" になる。 */
export type RecapPayload = Record<RecapPeriod, RecapPeriodData>;

const toRecapItem = (it: BaseItem): RecapItem => ({
  id: it.id,
  url: it.url,
  title: it.title,
  tags: it.tags,
  source: it.source,
  publishedAt: it.publishedAt,
  fetchedAt: it.fetchedAt,
  popularity: it.popularity,
  popularityLabel: it.popularityLabel,
});

/**
 * Recap タブの集計をサーバ側で済ませる。
 *
 * 以前は 60 日分の生 bundle をそのままクライアントに渡して `useMemo` で集計していたが、
 * 実際に描画されるのはタグ行 10 件と代表記事 20 件程度なので、集計結果だけを送る。
 * `trend.ts` / `bigTags.ts` は "use client" を持たない純関数なのでサーバから直接呼べる。
 *
 * 基準日は archive[0] (最新日) 固定 = 全ページで同一なので、`memoByKey` でビルド中 1 回だけ集計する。
 */
export const buildRecap = cache(memoByKey(async (latestDate: string): Promise<RecapPayload> => {
  const bundles = await getWindow(latestDate, RECAP_WINDOW_DAYS);
  const out = {} as RecapPayload;

  for (const period of RECAP_PERIODS) {
    const dates = dateRange(latestDate, period);
    const prevDates = dateRange(latestDate, period * 2).slice(0, period);
    const allItems = dates.flatMap((d) => bundles[d]?.items ?? []);

    const freq = tagFrequency(bundles, dates, prevDates, 200);
    const series = tagCountsByDate(bundles, dates);
    const rising = risingTags(bundles, dates, {
      minRecent: period === 7 ? 1 : 2,
      topN: 200,
    });
    const ratioByTag = new Map(rising.map((r) => [r.tag, r.ratio]));
    const world = worldTrendTags(bundles, dates, 200);
    const worldByTag = new Map(world.map((w) => [w.tag, w.trendSum]));

    const tagRows: RecapTagRow[] = freq.map((f) => ({
      tag: f.tag,
      bigGroup: f.bigGroup,
      count: f.count,
      delta: f.delta,
      isNew: f.isNew,
      series: series[f.tag] ?? [],
      ratio: ratioByTag.get(f.tag) ?? 0,
      worldSum: worldByTag.get(f.tag) ?? 0,
    }));
    tagRows.sort((a, b) => {
      const aPin = a.ratio >= 2.0 ? 1 : 0;
      const bPin = b.ratio >= 2.0 ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      return b.count - a.count || a.tag.localeCompare(b.tag);
    });

    const counts = bundleCounts(allItems);
    const bigCounts = bigTagCountsByDate(bundles, dates);
    // 安定ソートなので、先に並べてから大タグで絞っても「絞ってから並べる」と同じ順になる。
    const newsByTrend = allItems
      .filter((it) => it.kind !== "paper")
      .sort((a, b) => trendScore(b) - trendScore(a));
    const groups: RecapGroup[] = BIG_TAGS.map((t) => ({
      id: t.id,
      n: counts[t.id],
      counts: bigCounts[t.id],
      top: newsByTrend
        .filter((it) => itemBigTags(it).includes(t.id))
        .slice(0, 3)
        .map(toRecapItem),
    }));
    const best = newsByTrend.slice(0, 5).map(toRecapItem);

    out[period] = {
      firstDate: dates[0] ?? latestDate,
      lastDate: dates[dates.length - 1] ?? latestDate,
      totals: { items: counts.all, papers: counts.paper, news: counts.news },
      tagRows: tagRows.slice(0, 10),
      groups,
      best,
    };
  }

  return out;
}));
