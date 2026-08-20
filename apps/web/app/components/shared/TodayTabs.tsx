"use client";
import type { TodayTab } from "./lib/today";

/**
 * Today 画面のセグメント切替: All / 論文 / ニュース。
 * ヘッダー直下に水平に並ぶアンダーライン式タブ。各タブに件数を併記する。
 * mobile (TodayScreen) / desktop (DayList) の両方から使う。
 */
export function TodayTabs({
  tab,
  onChange,
  counts,
  pad = "0 14px",
}: {
  tab: TodayTab;
  onChange: (t: TodayTab) => void;
  counts: { all: number; paper: number; news: number };
  /** レイアウトごとの左右パディング。desktop は本文と揃えて広めに取る。 */
  pad?: string;
}) {
  const items: { id: TodayTab; label: string; n: number }[] = [
    { id: "all", label: "All", n: counts.all },
    { id: "paper", label: "論文", n: counts.paper },
    { id: "news", label: "ニュース", n: counts.news },
  ];
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 0,
        padding: pad,
        borderBottom: "0.5px solid var(--rule)",
        background: "var(--bg)",
        flexShrink: 0,
      }}
    >
      {items.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            style={{
              background: "none",
              border: 0,
              cursor: "pointer",
              padding: "10px 10px 11px",
              borderBottom: active ? "2px solid var(--fg)" : "2px solid transparent",
              color: active ? "var(--fg)" : "var(--fg-faint)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "baseline",
              gap: 5,
              marginRight: 4,
            }}
          >
            <span>{t.label}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: active ? "var(--fg-muted)" : "var(--fg-faint)",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {t.n}
            </span>
          </button>
        );
      })}
    </div>
  );
}
