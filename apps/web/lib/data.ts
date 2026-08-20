import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";
import type { DailyBundle, DailyIndex } from "@daily-news/shared";
import { dateRange } from "@/app/components/shared/lib/trend";

const DATA_DIR = join(process.cwd(), "..", "..", "data");

/**
 * クライアントに渡す bundle の窓幅。
 * UI が日付として触れるのは `buildWeekSlots` の Mon-Sun リング (直近 7 日) だけなので、それに揃える。
 */
export const DAY_WINDOW_DAYS = 7;

export const getIndex = cache(async (): Promise<DailyIndex> => {
  try {
    const raw = await readFile(join(DATA_DIR, "index.json"), "utf-8");
    return JSON.parse(raw) as DailyIndex;
  } catch {
    // fall back to scanning directory
    try {
      const files = await readdir(DATA_DIR);
      const dates = files
        .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
        .map((f) => f.replace(/\.json$/, ""))
        .sort()
        .reverse();
      return { dates, updatedAt: new Date().toISOString() };
    } catch {
      return { dates: [], updatedAt: new Date().toISOString() };
    }
  }
});

/**
 * 1 日分の bundle を読む。存在しない/壊れている場合は null。
 *
 * `cache()` で包んでいるのは、1 ビルドで `/` と直近 N 日分の `/d/[date]` を生成する際に
 * 同じ日の JSON を何度も読み直さないため (Recap の 60 日窓は全ページで共通)。
 */
export const getBundle = cache(async (date: string): Promise<DailyBundle | null> => {
  try {
    const raw = await readFile(join(DATA_DIR, `${date}.json`), "utf-8");
    return JSON.parse(raw) as DailyBundle;
  } catch {
    return null;
  }
});

/**
 * latestDate を末尾とする直近 days 日の bundle を読む (欠損日はスキップ)。
 *
 * クライアントに渡すのは常にこの窓だけ。履歴全体を渡すと 1 ページの RSC ペイロードが
 * 履歴長に比例して膨らみ、`/d/[date]` のページ数と掛け算になって破綻する。
 * 窓幅は UI が実際に触る範囲 (`buildWeekSlots` の直近 7 日) に合わせる。
 */
export async function getWindow(
  latestDate: string,
  days: number,
): Promise<Record<string, DailyBundle>> {
  const dates = dateRange(latestDate, days);
  const entries = await Promise.all(
    dates.map(async (d) => [d, await getBundle(d)] as const),
  );
  const out: Record<string, DailyBundle> = {};
  for (const [d, b] of entries) if (b) out[d] = b;
  return out;
}

/**
 * クライアントに渡す用の窓。`trending` (site-wide トレンドのスナップショット) を落とす。
 *
 * `trending` を読むのは Recap の `worldTrendTags` だけで、それはサーバ集計
 * (`lib/recap.ts`) に移したので UI 側では不要。1 日あたり 20KB 強 = 日次 JSON の
 * 約 1/3 を占めるため、落とすとページのペイロードがそのまま軽くなる。
 */
export async function getClientWindow(
  latestDate: string,
  days: number,
): Promise<Record<string, DailyBundle>> {
  const bundles = await getWindow(latestDate, days);
  const out: Record<string, DailyBundle> = {};
  for (const [d, bundle] of Object.entries(bundles)) {
    const { trending: _trending, ...rest } = bundle;
    out[d] = rest;
  }
  return out;
}
