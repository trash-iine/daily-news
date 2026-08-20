"use client";
import { useMemo } from "react";
import type { BaseItem, DailyBundle } from "@daily-news/shared";
import type { TodayTab } from "../shared/lib/today";
import { TodayTabs } from "../shared/TodayTabs";
import { SeriesCard } from "../shared/SeriesCard";
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
  saved,
  toggleSave,
  nowMs,
  scoreScale,
  onJump,
}: {
  bundle: DailyBundle;
  bundles: Record<string, DailyBundle>;
  tab: TodayTab;
  setTab: (t: TodayTab) => void;
  counts: Record<string, number>;
  /** DesktopApp 側でタブ + 大タグフィルタを適用済みの items。 */
  items: BaseItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  saved: Set<string>;
  toggleSave: (id: string) => void;
  nowMs: number;
  scoreScale: number;
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}) {
  const groups = useMemo(() => {
    if (tab !== "all") {
      return [
        {
          key: tab,
          label: tab === "paper" ? "論文" : "ニュース",
          sub: `${items.length} 件`,
          items,
        },
      ];
    }
    const papers = items.filter((i) => i.kind === "paper");
    const news = items.filter((i) => i.kind === "news");
    return [
      papers.length && { key: "papers", label: "論文", sub: `${papers.length} 本`, items: papers },
      news.length && { key: "news", label: "ニュース", sub: `${news.length} 件`, items: news },
    ].filter(Boolean) as { key: string; label: string; sub: string; items: BaseItem[] }[];
  }, [items, tab]);

  return (
    <>
      <TodayTabs
        tab={tab}
        onChange={setTab}
        counts={{ all: counts.all ?? 0, paper: counts.paper ?? 0, news: counts.news ?? 0 }}
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

        {groups.map((g) => (
          <section key={g.key}>
            {tab === "all" && (
              <header
                style={{
                  padding: "16px 20px 8px",
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
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    color: "var(--fg-faint)",
                  }}
                >
                  {g.sub}
                </span>
              </header>
            )}
            {g.items.map((it) => (
              <ListCard
                key={it.id}
                item={it}
                selected={selectedId === it.id}
                onSelect={() => onSelect(it.id)}
                saved={saved.has(it.id)}
                onSave={() => toggleSave(it.id)}
                nowMs={nowMs}
                scoreScale={scoreScale}
              />
            ))}
          </section>
        ))}

        {items.length === 0 && (
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
