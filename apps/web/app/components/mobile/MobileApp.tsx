"use client";
import type { DailyBundle } from "@daily-news/shared";
import type { TabId } from "../shared/lib/nav";
import { TabBar } from "./atoms/navigation";
import { TodayScreen } from "./TodayScreen";
import { SavedScreen } from "../shared/SavedScreen";
import { RecapScreen } from "../shared/RecapScreen";

/**
 * スマホ幅のシェル。下部 TabBar + スワイプ日送り (DayCarousel) がこのレイヤーの固有機能。
 * 表示状態 (tab / currentDate / saved / nowMs) は desktop 版と共有するため AppRoot が持ち、
 * ここでは props で受け取るだけにしている。
 */
export function MobileApp({
  archive,
  bundles,
  currentDate,
  setCurrentDate,
  tab,
  setTab,
  saved,
  toggleSave,
  nowMs,
}: {
  archive: string[];
  bundles: Record<string, DailyBundle>;
  currentDate: string | null;
  setCurrentDate: (d: string) => void;
  tab: TabId;
  setTab: (t: TabId) => void;
  saved: Set<string>;
  toggleSave: (id: string) => void;
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
            saved={saved}
            toggleSave={toggleSave}
            nowMs={nowMs}
          />
        )}
        {tab === "saved" && (
          <SavedScreen allBundles={bundles} saved={saved} toggleSave={toggleSave} nowMs={nowMs} />
        )}
        {tab === "recap" && <RecapScreen allBundles={bundles} archive={archive} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
