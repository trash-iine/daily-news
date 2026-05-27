"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import { DayPanel } from "./DayPanel";
import { buildWeekSlots, type TodayTab, type WeekSlot } from "./atoms/today-controls";

const SWIPE_AXIS_DECIDE_PX = 6;
const SWIPE_COMMIT_RATIO = 0.28;
const SWIPE_COMMIT_MIN_PX = 80;
const SNAP_MS = 240;

export type DayCarouselHandle = {
  getCurrentScroller: () => HTMLDivElement | null;
};

/**
 * Mon-Sun 固定リング上で currentDate の隣 (inArchive=true のみ) を返す。
 * dir=+1 は曜日順で次 (later), -1 は前 (earlier)。リングは archive[0] アンカー。
 */
function ringNeighbor(
  slots: WeekSlot[],
  currentDate: string,
  dir: -1 | 1,
): string | null {
  const n = slots.length;
  if (n === 0) return null;
  const idx = slots.findIndex((s) => s.iso === currentDate);
  if (idx < 0) return null;
  for (let step = 1; step <= n; step++) {
    const j = ((idx + dir * step) % n + n) % n;
    const slot = slots[j];
    if (slot && slot.inArchive && slot.iso !== currentDate) return slot.iso;
  }
  return null;
}

export const DayCarousel = forwardRef<DayCarouselHandle, {
  archive: string[];
  currentDate: string;
  bundle: DailyBundle;
  bundles: Record<string, DailyBundle>;
  setCurrentDate: (d: string) => void;
  tab: TodayTab;
  bigFilter: BigTagGroup | null;
  setBigFilter: (g: BigTagGroup | null) => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  highlighted: string | null;
  saved: Set<string>;
  toggleSave: (id: string) => void;
  nowMs: number;
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}>(function DayCarousel(props, ref) {
  const {
    archive,
    currentDate,
    bundle,
    bundles,
    setCurrentDate,
    tab,
    bigFilter,
    setBigFilter,
    expanded,
    setExpanded,
    highlighted,
    saved,
    toggleSave,
    nowMs,
    onJump,
  } = props;

  const slots = useMemo(() => buildWeekSlots(archive), [archive]);
  const earlierDate = useMemo(() => ringNeighbor(slots, currentDate, -1), [slots, currentDate]);
  const laterDate = useMemo(() => ringNeighbor(slots, currentDate, 1), [slots, currentDate]);
  const earlierBundle = earlierDate ? bundles[earlierDate] ?? null : null;
  const laterBundle = laterDate ? bundles[laterDate] ?? null : null;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentPanelRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const axisRef = useRef<"undecided" | "x" | "y">("undecided");

  const [dragPx, setDragPx] = useState(0);
  const [transition, setTransition] = useState(false);

  useImperativeHandle(
    ref,
    () => ({ getCurrentScroller: () => currentPanelRef.current }),
    [],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      widthRef.current = el.clientWidth;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const commitNeighbor = useCallback(
    (date: string) => {
      flushSync(() => {
        setTransition(false);
        setDragPx(0);
        setCurrentDate(date);
      });
    },
    [setCurrentDate],
  );

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (!t) return;
    startRef.current = { x: t.clientX, y: t.clientY };
    axisRef.current = "undecided";
    setTransition(false);
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const start = startRef.current;
      if (!start) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (axisRef.current === "undecided") {
        if (Math.abs(dx) < SWIPE_AXIS_DECIDE_PX && Math.abs(dy) < SWIPE_AXIS_DECIDE_PX) return;
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (axisRef.current !== "x") return;
      // 境界クランプ: 隣の日が無い方向はゼロ
      let clamped = dx;
      if (clamped > 0 && !earlierDate) clamped = 0;
      if (clamped < 0 && !laterDate) clamped = 0;
      setDragPx(clamped);
    },
    [earlierDate, laterDate],
  );

  const onTouchEnd = useCallback(() => {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;
    if (axisRef.current !== "x") {
      axisRef.current = "undecided";
      return;
    }
    axisRef.current = "undecided";
    const width = widthRef.current || 1;
    const threshold = Math.max(SWIPE_COMMIT_MIN_PX, width * SWIPE_COMMIT_RATIO);
    if (dragPx <= -threshold && laterDate) {
      // 右→左スワイプ完走 → 次の曜日 (Mon-Sun リング上の次スロット)
      setTransition(true);
      setDragPx(-width);
    } else if (dragPx >= threshold && earlierDate) {
      // 左→右スワイプ完走 → 前の曜日 (Mon-Sun リング上の前スロット)
      setTransition(true);
      setDragPx(width);
    } else {
      setTransition(true);
      setDragPx(0);
    }
  }, [dragPx, laterDate, earlierDate]);

  const onTransitionEnd = useCallback(() => {
    const width = widthRef.current || 1;
    if (dragPx <= -width + 1 && laterDate) {
      commitNeighbor(laterDate);
    } else if (dragPx >= width - 1 && earlierDate) {
      commitNeighbor(earlierDate);
    } else if (dragPx === 0) {
      setTransition(false);
    }
  }, [commitNeighbor, dragPx, laterDate, earlierDate]);

  // touchmove は passive デフォルトなので preventDefault が効かない端末がある。
  // 横軸ロック中の縦スクロール抑制のため non-passive で再登録。
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => {
      if (axisRef.current === "x") e.preventDefault();
    };
    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, []);

  // 中央パネルが常に translateX(-100%) 位置に来るよう、earlier の有無で base offset を変える。
  // panels 配列は左から earlier(前の曜日)?, current, later(次の曜日)? の順で並べる。
  const panels: Array<{ key: string; bundle: DailyBundle; isCurrent: boolean }> = [];
  if (earlierBundle) panels.push({ key: earlierBundle.date, bundle: earlierBundle, isCurrent: false });
  panels.push({ key: bundle.date, bundle, isCurrent: true });
  if (laterBundle) panels.push({ key: laterBundle.date, bundle: laterBundle, isCurrent: false });

  // current パネルのインデックス。base offset は % で表すことで初期幅 0 でも正しく揃う。
  const currentIndex = earlierBundle ? 1 : 0;

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{
        position: "relative",
        flex: 1,
        overflow: "hidden",
        touchAction: "pan-y",
      }}
    >
      <div
        onTransitionEnd={onTransitionEnd}
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          transform: `translate(calc(${-currentIndex * 100}% + ${dragPx}px), 0)`,
          transition: transition ? `transform ${SNAP_MS}ms ease-out` : "none",
          willChange: "transform",
        }}
      >
        {panels.map((p) => (
          <DayPanel
            key={p.key}
            ref={p.isCurrent ? currentPanelRef : undefined}
            bundle={p.bundle}
            bundles={bundles}
            tab={tab}
            bigFilter={bigFilter}
            setBigFilter={setBigFilter}
            expanded={expanded}
            setExpanded={setExpanded}
            highlighted={highlighted}
            saved={saved}
            toggleSave={toggleSave}
            nowMs={nowMs}
            onJump={onJump}
          />
        ))}
      </div>
    </div>
  );
});
