"use client";
import { useEffect, useState } from "react";
import type { DailyBundle } from "@daily-news/shared";
import { TabBar, type TabId } from "./atoms";
import { TodayScreen } from "./TodayScreen";
import { SavedScreen } from "./SavedScreen";
import { RecapScreen } from "./RecapScreen";
import { useSaved } from "./useSaved";

export function MobileApp({
  archive,
  bundles,
  initialDate,
  generatedAt,
}: {
  archive: string[];
  bundles: Record<string, DailyBundle>;
  initialDate: string | null;
  generatedAt: string;
}) {
  const [tab, setTab] = useState<TabId>("today");
  const [currentDate, setCurrentDate] = useState<string | null>(initialDate);
  const { saved, toggle } = useSaved();

  // SSR uses bundle.generatedAt; CSR overrides with real now after mount.
  const [nowMs, setNowMs] = useState<number>(() => new Date(generatedAt).getTime());
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

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
            toggleSave={toggle}
            nowMs={nowMs}
          />
        )}
        {tab === "saved" && (
          <SavedScreen allBundles={bundles} saved={saved} toggleSave={toggle} nowMs={nowMs} />
        )}
        {tab === "recap" && <RecapScreen allBundles={bundles} archive={archive} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
