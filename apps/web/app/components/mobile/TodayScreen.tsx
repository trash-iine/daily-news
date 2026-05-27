"use client";
import { useCallback, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import { BIG_TAGS, itemBigTags, weekdayJa } from "./lib";
import { BigTagFilter, TodayTabs, WeekStrip, type TodayTab } from "./atoms";
import { ArticleCard } from "./ArticleCard";
import { BriefCarousel } from "./BriefCarousel";
import { SeriesCard } from "./SeriesCard";

const HIGHLIGHT_MS = 1600;
const SWIPE_THRESHOLD_PX = 60;
const SWIPE_AXIS_RATIO = 1.5;

/**
 * archive (newest-first) 上で current の隣を返す。delta=-1 で newer、+1 で older。
 * archive にギャップがあっても次に存在する日付に「スキップ」される。
 */
function adjacentDate(archive: string[], current: string, delta: -1 | 1): string | null {
  const i = archive.indexOf(current);
  if (i < 0) return null;
  const j = i + delta;
  return j >= 0 && j < archive.length ? archive[j] ?? null : null;
}

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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || !currentDate) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_AXIS_RATIO) return;
      // 左スワイプ (dx<0) → 過去 (older=archive[i+1]) / 右スワイプ → 未来 (newer=archive[i-1])
      const next = adjacentDate(archive, currentDate, dx < 0 ? 1 : -1);
      if (next) {
        setCurrentDate(next);
        setExpanded(null);
      }
    },
    [archive, currentDate, setCurrentDate],
  );

  const counts = useMemo<Record<string, number>>(() => {
    const items = bundle?.items ?? [];
    const c: Record<string, number> = {
      all: items.length,
      paper: items.filter((i) => i.kind === "paper").length,
      news: items.filter((i) => i.kind === "news").length,
    };
    for (const t of BIG_TAGS) {
      c[t.id] = items.filter((it) => itemBigTags(it).includes(t.id)).length;
    }
    return c;
  }, [bundle]);

  /** 5-MIN BRIEF: 論文 top 2 + ニュース top 3 をスコア降順で混ぜた 5 件 (All タブのみ表示)。 */
  const briefItems = useMemo<BaseItem[]>(() => {
    if (!bundle) return [];
    const papers = bundle.items.filter((i) => i.kind === "paper").slice(0, 2);
    const news = bundle.items.filter((i) => i.kind === "news").slice(0, 3);
    return [...papers, ...news].sort((a, b) => b.score - a.score).slice(0, 5);
  }, [bundle]);

  const filtered: BaseItem[] = useMemo(() => {
    if (!bundle) return [];
    return bundle.items.filter((it) => {
      if (tab === "paper" && it.kind !== "paper") return false;
      if (tab === "news" && it.kind !== "news") return false;
      if (bigFilter && !itemBigTags(it).includes(bigFilter)) return false;
      return true;
    });
  }, [bundle, tab, bigFilter]);

  const groups = useMemo(() => {
    if (tab !== "all") {
      return [
        {
          key: tab,
          label: tab === "paper" ? "論文" : "ニュース",
          sub: `${filtered.length} 件`,
          items: filtered,
        },
      ];
    }
    const papers = filtered.filter((i) => i.kind === "paper");
    const news = filtered.filter((i) => i.kind === "news");
    return [
      papers.length && { key: "papers", label: "論文", sub: `${papers.length} 本`, items: papers },
      news.length && { key: "news", label: "ニュース", sub: `${news.length} 件`, items: news },
    ].filter(Boolean) as { key: string; label: string; sub: string; items: BaseItem[] }[];
  }, [filtered, tab]);

  /**
   * Brief カード → 該当タブを開き、対象カードへスクロール + 1.6s ハイライト。
   * paper なら "paper" タブへ、news なら "news" タブへ移動する (文脈が薄れない範囲で)。
   */
  const jumpTo = useCallback((id: string, kind: BaseItem["kind"]) => {
    setTab(kind === "paper" ? "paper" : "news");
    setBigFilter(null);
    setExpanded(id);
    setHighlighted(id);

    // タブ切替で再レンダリングされるため次フレームでスクロール。
    requestAnimationFrame(() => {
      const scroller = scrollerRef.current;
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

  if (!bundle) {
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

      <div
        ref={scrollerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ flex: 1, overflow: "auto", paddingBottom: 8 }}
      >
        {tab === "all" && (
          <SeriesCard
            bundles={bundles}
            latestDate={bundle.date}
            todayItems={bundle.items}
            onJump={jumpTo}
          />
        )}
        {tab === "all" && briefItems.length > 0 && (
          <BriefCarousel items={briefItems} nowMs={nowMs} onJump={jumpTo} />
        )}

        <BigTagFilter value={bigFilter} onChange={setBigFilter} counts={counts} />

        {groups.map((g) => (
          <section key={g.key}>
            {tab === "all" && (
              <header
                style={{
                  padding: "16px 18px 8px",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  justifyContent: "space-between",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 18,
                    fontWeight: 500,
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {g.label}
                </h2>
                <span
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-faint)" }}
                >
                  {g.sub}
                </span>
              </header>
            )}
            {g.items.map((it) => (
              <ArticleCard
                key={it.id}
                item={it}
                expanded={expanded === it.id}
                highlighted={highlighted === it.id}
                onToggle={() => setExpanded(expanded === it.id ? null : it.id)}
                saved={saved.has(it.id)}
                onSave={() => toggleSave(it.id)}
                nowMs={nowMs}
              />
            ))}
          </section>
        ))}

        {filtered.length === 0 && (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "var(--fg-faint)",
              fontSize: 13,
            }}
          >
            該当する記事はありません
          </div>
        )}
      </div>
    </>
  );
}
