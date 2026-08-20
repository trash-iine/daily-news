"use client";
import type { DailyBundle } from "@daily-news/shared";
import type { RecapPayload } from "@/lib/recap";
import type { TabId } from "../shared/lib/nav";
import { TabBar } from "./atoms/navigation";
import { TodayScreen } from "./TodayScreen";
import { RecapScreen } from "../shared/RecapScreen";

/**
 * スマホ幅のシェル。下部 TabBar + スワイプ日送り (DayCarousel) がこのレイヤーの固有機能。
 * 表示状態 (tab / currentDate / nowMs) は desktop 版と共有するため AppRoot が持ち、
 * ここでは props で受け取るだけにしている。
 */
export function MobileApp({
  archive,
  bundles,
  recap,
  currentDate,
  setCurrentDate,
  tab,
  setTab,
  nowMs,
}: {
  archive: string[];
  bundles: Record<string, DailyBundle>;
  recap: RecapPayload;
  currentDate: string | null;
  setCurrentDate: (d: string) => void;
  tab: TabId;
  setTab: (t: TabId) => void;
  nowMs: number;
}) {
  const bundle = currentDate ? bundles[currentDate] ?? null : null;

  return (
    <div className="shell">
      <main className="shell-main">
        {tab === "today" && (
          <TodayScreen
            archive={archive}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            bundle={bundle}
            bundles={bundles}
            nowMs={nowMs}
          />
        )}
        {tab === "recap" && <RecapScreen recap={recap} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
