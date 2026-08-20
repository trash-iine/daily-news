"use client";
import { useEffect, useState } from "react";
import type { DailyBundle } from "@daily-news/shared";
import type { RecapPayload } from "@/lib/recap";
import type { TabId } from "./shared/lib/nav";
import { MobileApp } from "./mobile/MobileApp";
import { DesktopApp } from "./desktop/DesktopApp";

/**
 * mobile / desktop 両方のツリーを SSR で描画し、globals.css の
 * .viewport-mobile / .viewport-desktop (1024px 境界) で出し分ける。
 *
 * 表示状態はここに集約する。
 *
 * `bundles` / `archive` はサーバが渡す直近 7 日の窓だけで、履歴全体は入らない
 * (`lib/data.ts` の `getWindow`)。日付移動は `buildWeekSlots` / `ringNeighbor` の
 * リング内に限られるので窓外には出ない。Recap は集計済みデータ (`recap`) を
 * 受け取るため生 bundle を必要としない。
 *
 * ここに履歴全体を渡すと client component の props として全ページの RSC ペイロードに
 * 直列化され、日数 × ページ数で膨らむ。
 */
export function AppRoot({
  archive,
  bundles,
  recap,
  initialDate,
  generatedAt,
}: {
  /** 窓内の日付 (新しい順)。リングのアンカーは archive[0]。 */
  archive: string[];
  bundles: Record<string, DailyBundle>;
  recap: RecapPayload;
  initialDate: string | null;
  generatedAt: string;
}) {
  const [tab, setTab] = useState<TabId>("today");
  const [currentDate, setCurrentDate] = useState<string | null>(initialDate);

  // SSR uses bundle.generatedAt; CSR overrides with real now after mount.
  const [nowMs, setNowMs] = useState<number>(() => new Date(generatedAt).getTime());
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const shared = {
    archive,
    bundles,
    recap,
    currentDate,
    setCurrentDate,
    tab,
    setTab,
    nowMs,
  };

  return (
    <>
      <div className="viewport-mobile">
        <MobileApp {...shared} />
      </div>
      <div className="viewport-desktop">
        <DesktopApp {...shared} />
      </div>
    </>
  );
}
