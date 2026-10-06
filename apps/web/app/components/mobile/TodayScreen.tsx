"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import { fmtDateHeader } from "../shared/lib/format";
import { bundleCounts } from "../shared/lib/bundle";
import { WeekStrip } from "./atoms/today-controls";
import { TodayTabs } from "../shared/TodayTabs";
import type { TodayTab } from "../shared/lib/today";
import { DayCarousel, type DayCarouselHandle } from "./DayCarousel";

const HIGHLIGHT_MS = 1600;

export function TodayScreen({
  archive,
  currentDate,
  setCurrentDate,
  bundles,
  nowMs,
}: {
  archive: string[];
  currentDate: string;
  setCurrentDate: (d: string) => void;
  bundles: Record<string, DailyBundle>;
  nowMs: number;
}) {
  const [tab, setTab] = useState<TodayTab>("all");
  const [bigFilter, setBigFilter] = useState<BigTagGroup | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const carouselRef = useRef<DayCarouselHandle | null>(null);
  const highlightTimer = useRef<number | null>(null);

  const bundle = bundles[currentDate] ?? null;
  const counts = useMemo(() => bundleCounts(bundle?.items ?? []), [bundle]);

  /**
   * 続いている話題カード → 該当タブを開き、対象カードへスクロール + 1.6s ハイライト。
   * paper なら "paper" タブへ、news なら "news" タブへ移動する (文脈が薄れない範囲で)。
   * 展開は論文だけの機能なので、news へ飛ぶときはスクロール + ハイライトのみ。
   */
  const jumpTo = useCallback((id: string, kind: BaseItem["kind"]) => {
    setTab(kind);
    setBigFilter(null);
    setExpanded(kind === "paper" ? id : null);
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

  if (!bundle) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--fg-faint)" }}>読み込み中…</div>
    );
  }

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
              {fmtDateHeader(new Date(bundle.date))}
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
            <div>{counts.all} items</div>
            <div style={{ fontSize: 9, color: "var(--fg-faint)" }}>
              {counts.news} N · {counts.paper} P
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
        counts={counts}
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
        nowMs={nowMs}
        onJump={jumpTo}
      />
    </>
  );
}
