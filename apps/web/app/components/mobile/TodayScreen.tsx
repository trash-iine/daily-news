"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import { weekdayJa } from "./lib/format";
import { bundleCounts } from "./lib/bundle";
import { TodayTabs, WeekStrip, type TodayTab } from "./atoms/today-controls";
import { DayCarousel, type DayCarouselHandle } from "./DayCarousel";

const HIGHLIGHT_MS = 1600;

export function TodayScreen({
  archive,
  currentDate,
  setCurrentDate,
  bundle,
  bundles,
  saved,
  toggleSave,
  nowMs,
}: {
  archive: string[];
  currentDate: string | null;
  setCurrentDate: (d: string) => void;
  bundle: DailyBundle | null;
  bundles: Record<string, DailyBundle>;
  saved: Set<string>;
  toggleSave: (id: string) => void;
  nowMs: number;
}) {
  const [tab, setTab] = useState<TodayTab>("all");
  const [bigFilter, setBigFilter] = useState<BigTagGroup | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const carouselRef = useRef<DayCarouselHandle | null>(null);
  const highlightTimer = useRef<number | null>(null);

  const counts = useMemo(() => bundleCounts(bundle?.items ?? []), [bundle]);

  /**
   * Brief カード → 該当タブを開き、対象カードへスクロール + 1.6s ハイライト。
   * paper なら "paper" タブへ、news なら "news" タブへ移動する (文脈が薄れない範囲で)。
   */
  const jumpTo = useCallback((id: string, kind: BaseItem["kind"]) => {
    setTab(kind === "paper" ? "paper" : "news");
    setBigFilter(null);
    setExpanded(id);
    setHighlighted(id);

    requestAnimationFrame(() => {
      const scroller = carouselRef.current?.getCurrentScroller() ?? null;
      const el = scroller?.querySelector<HTMLElement>(`#item-${CSS.escape(id)}`);
      if (scroller && el) {
        const top = el.offsetTop - 12;
        scroller.scrollTo({ top, behavior: "smooth" });
      }
    });

    if (highlightTimer.current !== null) {
      window.clearTimeout(highlightTimer.current);
    }
    highlightTimer.current = window.setTimeout(() => {
      setHighlighted(null);
      highlightTimer.current = null;
    }, HIGHLIGHT_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    };
  }, []);

  if (!bundle || !currentDate) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--fg-faint)" }}>読み込み中…</div>
    );
  }

  const date = new Date(bundle.date);
  const wd = weekdayJa(date);
  const paperCount = counts.paper ?? 0;

  return (
    <>
      <div style={{ padding: "6px 18px 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "var(--fg-faint)",
                textTransform: "uppercase",
              }}
            >
              {date.getFullYear()} · {String(date.getMonth() + 1).padStart(2, "0")}/
              {String(date.getDate()).padStart(2, "0")} ({wd})
            </div>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                margin: "1px 0 0",
                lineHeight: 1.1,
              }}
            >
              Daily Digest
            </h1>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-muted)",
              textAlign: "right",
            }}
          >
            <div>{bundle.items.length} items</div>
            <div style={{ fontSize: 9, color: "var(--fg-faint)" }}>
              {bundle.items.length - paperCount} N · {paperCount} P
            </div>
          </div>
        </div>
      </div>

      <TodayTabs
        tab={tab}
        onChange={(t) => {
          setTab(t);
          setExpanded(null);
        }}
        counts={{ all: counts.all ?? 0, paper: counts.paper ?? 0, news: counts.news ?? 0 }}
      />

      <WeekStrip
        archive={archive}
        currentDate={currentDate}
        onChange={(d) => {
          setCurrentDate(d);
          setExpanded(null);
        }}
      />

      <DayCarousel
        ref={carouselRef}
        archive={archive}
        currentDate={currentDate}
        bundle={bundle}
        bundles={bundles}
        setCurrentDate={(d) => {
          setCurrentDate(d);
          setExpanded(null);
        }}
        tab={tab}
        bigFilter={bigFilter}
        setBigFilter={setBigFilter}
        expanded={expanded}
        setExpanded={setExpanded}
        highlighted={highlighted}
        saved={saved}
        toggleSave={toggleSave}
        nowMs={nowMs}
        onJump={jumpTo}
      />
    </>
  );
}
