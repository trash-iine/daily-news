"use client";
import { forwardRef, memo, useMemo } from "react";
import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import { bundleCounts, filterDayItems, newsScoreScale } from "../shared/lib/bundle";
import { ArticleCard } from "../shared/ArticleCard";
import { BigTagFilter } from "./atoms/today-controls";
import type { TodayTab } from "../shared/lib/today";
import { SeriesCard } from "../shared/SeriesCard";
import { KindSections } from "../shared/KindSections";

/**
 * 1 日分のスクロール可能ビュー。DayCarousel から prev/current/next の 3 枚として描画される。
 * 共有 UI 状態 (tab, bigFilter, expanded, highlighted) は props で受け取り panel ローカルでは保持しない。
 * スワイプ中は DayCarousel が touchmove ごとに再レンダーされるが、props は不変なので memo で 3 枚の再描画を省く。
 */
export const DayPanel = memo(forwardRef<HTMLDivElement, {
  bundle: DailyBundle;
  bundles: Record<string, DailyBundle>;
  tab: TodayTab;
  bigFilter: BigTagGroup | null;
  setBigFilter: (g: BigTagGroup | null) => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  highlighted: string | null;
  nowMs: number;
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}>(function DayPanel(
  {
    bundle,
    bundles,
    tab,
    bigFilter,
    setBigFilter,
    expanded,
    setExpanded,
    highlighted,
    nowMs,
    onJump,
  },
  ref,
) {
  const counts = useMemo(() => bundleCounts(bundle.items), [bundle]);
  /** 評価バーの分母。フィルタ結果ではなく日次全体から取り、タブ切り替えでバー長が動かないようにする。 */
  const scoreScale = useMemo(() => newsScoreScale(bundle.items), [bundle]);

  const filtered = useMemo(
    () => filterDayItems(bundle.items, tab, bigFilter),
    [bundle, tab, bigFilter],
  );

  return (
    <div
      ref={ref}
      style={{
        flex: "0 0 100%",
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overscrollBehavior: "contain",
        paddingBottom: 8,
      }}
    >
      {tab === "all" && (
        <SeriesCard
          bundles={bundles}
          latestDate={bundle.date}
          todayItems={bundle.items}
          onJump={onJump}
        />
      )}

      <BigTagFilter value={bigFilter} onChange={setBigFilter} counts={counts} />

      <KindSections
        items={filtered}
        tab={tab}
        padX={18}
        renderItem={(it) => (
          <ArticleCard
            key={it.id}
            item={it}
            expanded={expanded === it.id}
            highlighted={highlighted === it.id}
            onToggle={() => setExpanded(expanded === it.id ? null : it.id)}
            nowMs={nowMs}
            scoreScale={scoreScale}
          />
        )}
      />
    </div>
  );
}));
