import { notFound } from "next/navigation";
import { DAY_WINDOW_DAYS, getBundle, getIndex, getClientWindow } from "@/lib/data";
import { buildRecap } from "@/lib/recap";
import { AppRoot } from "@/app/components/AppRoot";

/**
 * 日付ページの静的生成は直近 STATIC_DAYS 日だけ。
 *
 * このルートへのリンクは UI 上に存在せず (日付移動は WeekRail / カルーセルのクライアント状態)、
 * 直リンク専用。全履歴分プリレンダすると「ページ数 × 1 ページのデータ量」で
 * ビルド出力が二次関数的に膨らむ。
 */
const STATIC_DAYS = 30;

/** 窓外の古い日付は on-demand レンダリングせず 404。実行時に data/ を読まない構成を保つ。 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const idx = await getIndex();
  return idx.dates.slice(0, STATIC_DAYS).map((date) => ({ date }));
}

export default async function DatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const [idx, bundle] = await Promise.all([getIndex(), getBundle(date)]);
  if (!bundle) notFound();

  // Recap は「最新日基準の直近 N 日」なので、どの日付ページでも同じ集計を渡す (現行踏襲)。
  const [bundles, recap] = await Promise.all([
    getClientWindow(date, DAY_WINDOW_DAYS),
    buildRecap(idx.dates[0] ?? date),
  ]);

  return (
    <AppRoot
      archive={Object.keys(bundles).sort().reverse()}
      bundles={bundles}
      recap={recap}
      initialDate={date}
      generatedAt={bundle.generatedAt}
    />
  );
}
