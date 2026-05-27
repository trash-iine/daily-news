"use client";
import type { CSSProperties } from "react";
import type { BigTagGroup } from "@daily-news/shared";
import { BIG_TAGS } from "../lib/bigTags";

export function BigTagFilter({
  value,
  onChange,
  counts,
}: {
  value: BigTagGroup | null;
  onChange: (v: BigTagGroup | null) => void;
  counts: Record<string, number>;
}) {
  return (
    <div
      style={{
        padding: "0 16px 12px",
        display: "flex",
        gap: 4,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      <button
        onClick={() => onChange(null)}
        style={{
          flexShrink: 0,
          padding: "7px 10px",
          borderRadius: 999,
          background: value === null ? "var(--fg)" : "var(--bg-sunken)",
          color: value === null ? "var(--bg)" : "var(--fg-muted)",
          border: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        ALL{" "}
        <span style={{ fontSize: 9, opacity: 0.7, fontFeatureSettings: '"tnum"' }}>
          {counts.all}
        </span>
      </button>
      {BIG_TAGS.map((t) => {
        const active = value === t.id;
        const n = counts[t.id] || 0;
        const dim = n === 0;
        const bgStyle: CSSProperties = active
          ? { background: t.color, color: "white", border: `0.5px solid ${t.color}` }
          : {
              background: `color-mix(in oklch, ${t.color} 12%, var(--bg-sunken))`,
              color: `color-mix(in oklch, ${t.color} 70%, var(--fg))`,
              border: `0.5px solid color-mix(in oklch, ${t.color} 25%, transparent)`,
            };
        return (
          <button
            key={t.id}
            onClick={() => onChange(active ? null : t.id)}
            disabled={dim}
            style={{
              flexShrink: 0,
              padding: "7px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: dim ? "default" : "pointer",
              opacity: dim ? 0.4 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
              ...bgStyle,
            }}
          >
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.85 }}>{t.emoji}</span>
            {t.label}
            <span style={{ fontSize: 9, opacity: 0.75, fontFeatureSettings: '"tnum"' }}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

export type TodayTab = "all" | "paper" | "news";

/**
 * Today 画面のセグメント切替: All / 論文 / ニュース。
 * ヘッダー直下に水平に並ぶアンダーライン式タブ。各タブに件数を併記する。
 */
export function TodayTabs({
  tab,
  onChange,
  counts,
}: {
  tab: TodayTab;
  onChange: (t: TodayTab) => void;
  counts: { all: number; paper: number; news: number };
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
        padding: "0 14px",
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

/**
 * Mon-Sun 固定 7 スロットの週ストリップ。archive[0] (最新日) を末尾とする直近 7 日を
 * 各曜日スロットに配置するリングバッファ表示。archive に無い日は disabled。
 */
const WEEKDAY_MON_SUN = ["月", "火", "水", "木", "金", "土", "日"] as const;

export interface WeekSlot {
  iso: string;
  date: number;
  inArchive: boolean;
}

export function buildWeekSlots(archive: string[]): WeekSlot[] {
  const anchor = archive[0];
  if (!anchor) return [];
  const archiveSet = new Set(archive);
  const slots: (WeekSlot | null)[] = new Array(7).fill(null);
  const base = new Date(`${anchor}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}`;
    const dayIdx = d.getUTCDay(); // 0=Sun..6=Sat
    const slotIdx = dayIdx === 0 ? 6 : dayIdx - 1; // Mon=0..Sun=6
    slots[slotIdx] = { iso, date: d.getUTCDate(), inArchive: archiveSet.has(iso) };
  }
  return slots.filter((s): s is WeekSlot => s !== null);
}

export function WeekStrip({
  archive,
  currentDate,
  onChange,
}: {
  archive: string[];
  currentDate: string | null;
  onChange: (d: string) => void;
}) {
  if (!currentDate) return null;
  const slots = buildWeekSlots(archive);
  if (slots.length !== 7) return null;
  return (
    <div
      style={{
        padding: "0 16px 12px",
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 6,
      }}
    >
      {slots.map((slot, i) => {
        const active = slot.iso === currentDate;
        return (
          <button
            key={slot.iso}
            disabled={!slot.inArchive}
            onClick={() => onChange(slot.iso)}
            style={{
              padding: "8px 0",
              borderRadius: 10,
              background: active ? "var(--fg)" : "var(--bg-sunken)",
              color: active ? "var(--bg)" : "var(--fg-muted)",
              border: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 500,
              cursor: slot.inArchive ? "pointer" : "default",
              opacity: slot.inArchive ? 1 : 0.35,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 10, opacity: 0.7 }}>{WEEKDAY_MON_SUN[i]}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{slot.date}</span>
          </button>
        );
      })}
    </div>
  );
}
