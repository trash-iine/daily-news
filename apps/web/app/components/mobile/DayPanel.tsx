"use client";
import { forwardRef, useMemo } from "react";
import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import { BIG_TAGS, itemBigTags } from "./lib";
import { ArticleCard } from "./ArticleCard";
import { BigTagFilter, type TodayTab } from "./atoms";
import { BriefCarousel } from "./BriefCarousel";
import { SeriesCard } from "./SeriesCard";

/**
 * 1 日分のスクロール可能ビュー。DayCarousel から prev/current/next の 3 枚として描画される。
 * 共有 UI 状態 (tab, bigFilter, expanded, highlighted) は props で受け取り panel ローカルでは保持しない。
 */
export const DayPanel = forwardRef<HTMLDivElement, {
  bundle: DailyBundle;
  bundles: Record<string, DailyBundle>;
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
    saved,
    toggleSave,
    nowMs,
    onJump,
  },
  ref,
) {
  const counts = useMemo<Record<string, number>>(() => {
    const items = bundle.items;
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

  const briefItems = useMemo<BaseItem[]>(() => {
    const papers = bundle.items.filter((i) => i.kind === "paper").slice(0, 2);
    const news = bundle.items.filter((i) => i.kind === "news").slice(0, 3);
    return [...papers, ...news].sort((a, b) => b.score - a.score).slice(0, 5);
  }, [bundle]);

  const filtered: BaseItem[] = useMemo(() => {
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
      {tab === "all" && briefItems.length > 0 && (
        <BriefCarousel items={briefItems} nowMs={nowMs} onJump={onJump} />
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
  );
});
