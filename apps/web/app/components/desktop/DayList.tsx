"use client";
import type { BaseItem, DailyBundle } from "@daily-news/shared";
import type { TodayTab } from "../shared/lib/today";
import type { BundleCounts } from "../shared/lib/bundle";
import { TodayTabs } from "../shared/TodayTabs";
import { SeriesCard } from "../shared/SeriesCard";
import { KindSections } from "../shared/KindSections";
import { ListCard } from "./ListCard";

/**
 * デスクトップ中央カラム。DayPanel と同じ論文/ニュースのセクション分けをするが、
 * カードは選択式の ListCard で、詳細は右ペインが受け持つ。
 */
export function DayList({
  bundle,
  bundles,
  tab,
  setTab,
  counts,
  items,
  selectedId,
  onSelect,
  nowMs,
  scoreScale,
  onJump,
}: {
  bundle: DailyBundle;
  bundles: Record<string, DailyBundle>;
  tab: TodayTab;
  setTab: (t: TodayTab) => void;
  counts: BundleCounts;
  /** DesktopApp 側でタブ + 大タグフィルタを適用済みの items。 */
  items: BaseItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  nowMs: number;
  scoreScale: number;
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}) {
  return (
    <>
      <TodayTabs
        tab={tab}
        onChange={setTab}
        counts={counts}
        pad="0 16px"
      />
      <div className="desktop-scroll">
        {tab === "all" && (
          <SeriesCard
            bundles={bundles}
            latestDate={bundle.date}
            todayItems={bundle.items}
            onJump={onJump}
          />
        )}

        <KindSections
          items={items}
          tab={tab}
          padX={20}
          renderItem={(it) => (
            <ListCard
              key={it.id}
              item={it}
              selected={selectedId === it.id}
              onSelect={onSelect}
              nowMs={nowMs}
              scoreScale={scoreScale}
            />
          )}
        />
      </div>
    </>
  );
}
