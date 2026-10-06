"use client";
import { useMemo, type ReactNode } from "react";
import type { BaseItem } from "@daily-news/shared";
import type { TodayTab } from "./lib/today";

interface KindSection {
  key: string;
  label: string;
  sub: string;
  items: BaseItem[];
}

function groupByKind(items: BaseItem[], tab: TodayTab): KindSection[] {
  if (tab !== "all") {
    return [
      { key: tab, label: tab === "paper" ? "論文" : "ニュース", sub: `${items.length} 件`, items },
    ];
  }
  const papers = items.filter((i) => i.kind === "paper");
  const news = items.filter((i) => i.kind === "news");
  const out: KindSection[] = [];
  if (papers.length) out.push({ key: "papers", label: "論文", sub: `${papers.length} 本`, items: papers });
  if (news.length) out.push({ key: "news", label: "ニュース", sub: `${news.length} 件`, items: news });
  return out;
}

/**
 * Today の論文/ニュースのセクション分け + 空表示。mobile (DayPanel) と desktop (DayList) で共有し、
 * カード部分だけ `renderItem` で差し替える。見出しは All タブのときだけ出す。
 */
export function KindSections({
  items,
  tab,
  padX,
  renderItem,
}: {
  /** タブ + 大タグフィルタ適用済みの items。 */
  items: BaseItem[];
  tab: TodayTab;
  padX: number;
  renderItem: (it: BaseItem) => ReactNode;
}) {
  const groups = useMemo(() => groupByKind(items, tab), [items, tab]);
  return (
    <>
      {groups.map((g) => (
        <section key={g.key}>
          {tab === "all" && (
            <header
              style={{
                padding: `16px ${padX}px 8px`,
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
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-faint)" }}>
                {g.sub}
              </span>
            </header>
          )}
          {g.items.map(renderItem)}
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
    </>
  );
}
