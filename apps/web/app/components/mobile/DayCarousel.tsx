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
import type { TodayTab } from "./atoms";

const SWIPE_AXIS_DECIDE_PX = 6;
const SWIPE_COMMIT_RATIO = 0.28;
const SWIPE_COMMIT_MIN_PX = 80;
const SNAP_MS = 240;

export type DayCarouselHandle = {
  getCurrentScroller: () => HTMLDivElement | null;
};

/**
 * archive (newest-first) 上で current の隣を返す。delta=-1 で newer、+1 で older。
 */
function adjacentDate(archive: string[], current: string, delta: -1 | 1): string | null {
  const i = archive.indexOf(current);
  if (i < 0) return null;
  const j = i + delta;
  return j >= 0 && j < archive.length ? archive[j] ?? null : null;
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

  const prevDate = useMemo(() => adjacentDate(archive, currentDate, -1), [archive, currentDate]);
  const nextDate = useMemo(() => adjacentDate(archive, currentDate, 1), [archive, currentDate]);
  const prevBundle = prevDate ? bundles[prevDate] ?? null : null;
  const nextBundle = nextDate ? bundles[nextDate] ?? null : null;

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
      if (clamped > 0 && !prevDate) clamped = 0;
      if (clamped < 0 && !nextDate) clamped = 0;
      setDragPx(clamped);
    },
    [prevDate, nextDate],
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
    if (dragPx <= -threshold && nextDate) {
      // 左スワイプ完走 → 過去 (older=archive[i+1])
      setTransition(true);
      setDragPx(-width);
    } else if (dragPx >= threshold && prevDate) {
      // 右スワイプ完走 → 未来 (newer=archive[i-1])
      setTransition(true);
      setDragPx(width);
    } else {
      setTransition(true);
      setDragPx(0);
    }
  }, [dragPx, nextDate, prevDate]);

  const onTransitionEnd = useCallback(() => {
    const width = widthRef.current || 1;
    if (dragPx <= -width + 1 && nextDate) {
      commitNeighbor(nextDate);
    } else if (dragPx >= width - 1 && prevDate) {
      commitNeighbor(prevDate);
    } else if (dragPx === 0) {
      setTransition(false);
    }
  }, [commitNeighbor, dragPx, nextDate, prevDate]);

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

  // 中央パネルが常に translateX(-100%) 位置に来るよう、prevDate の有無で base offset を変える。
  // panels 配列は左から prev?, current, next? の順で並べる。
  const panels: Array<{ key: string; bundle: DailyBundle; isCurrent: boolean }> = [];
  if (prevBundle) panels.push({ key: prevBundle.date, bundle: prevBundle, isCurrent: false });
  panels.push({ key: bundle.date, bundle, isCurrent: true });
  if (nextBundle) panels.push({ key: nextBundle.date, bundle: nextBundle, isCurrent: false });

  // current パネルのインデックス。base offset は % で表すことで初期幅 0 でも正しく揃う。
  const currentIndex = prevBundle ? 1 : 0;

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
