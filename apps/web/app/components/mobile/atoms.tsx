"use client";
import type { CSSProperties } from "react";
import type { BigTagGroup } from "@daily-news/shared";
import { BIG_COLOR, BIG_TAGS, bigTagOf } from "./lib";

export function BigTagPill({ id, sm }: { id: BigTagGroup; sm?: boolean }) {
  const t = BIG_TAGS.find((x) => x.id === id);
  if (!t) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: sm ? "1px 6px" : "2px 8px",
        borderRadius: 4,
        fontSize: sm ? 10 : 11,
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        background: `color-mix(in oklch, ${t.color} 14%, transparent)`,
        color: `color-mix(in oklch, ${t.color} 70%, var(--fg))`,
        border: `0.5px solid color-mix(in oklch, ${t.color} 35%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999, background: t.color }} />
      {t.label}
    </span>
  );
}

export function Tag({ t, sm }: { t: string; sm?: boolean }) {
  const big = bigTagOf(t);
  const c = big ? BIG_COLOR[big] : "oklch(0.5 0.02 60)";
  return (
    <span
      style={{
        fontSize: sm ? 10 : 11,
        fontFamily: "var(--font-mono)",
        padding: sm ? "1px 6px" : "2px 7px",
        borderRadius: 4,
        background: `color-mix(in oklch, ${c} 10%, transparent)`,
        color: `color-mix(in oklch, ${c} 65%, var(--fg))`,
        border: `0.5px solid color-mix(in oklch, ${c} 26%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      #{t}
    </span>
  );
}

export type TabId = "today" | "saved" | "recap";

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  const tabs: { id: TabId; glyph: string; label: string }[] = [
    { id: "today", glyph: "◧", label: "Today" },
    { id: "saved", glyph: "★", label: "Saved" },
    { id: "recap", glyph: "▤", label: "Recap" },
  ];
  return (
    <div
      style={{
        flexShrink: 0,
        paddingTop: 8,
        paddingBottom: "max(22px, env(safe-area-inset-bottom))",
        paddingLeft: 12,
        paddingRight: 12,
        display: "grid",
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        gap: 4,
        background: "color-mix(in oklch, var(--bg-elev) 92%, transparent)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "0.5px solid var(--border)",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: "none",
            border: 0,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "6px 0",
            color: active === t.id ? "var(--fg)" : "var(--fg-faint)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1, fontFamily: "var(--font-mono)" }}>{t.glyph}</span>
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

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
        gap: 6,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      <button
        onClick={() => onChange(null)}
        style={{
          flexShrink: 0,
          padding: "8px 14px",
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
          gap: 6,
        }}
      >
        ALL{" "}
        <span style={{ fontSize: 10, opacity: 0.7, fontFeatureSettings: '"tnum"' }}>
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
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              cursor: dim ? "default" : "pointer",
              opacity: dim ? 0.4 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              ...bgStyle,
            }}
          >
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.85 }}>{t.emoji}</span>
            {t.label}
            <span style={{ fontSize: 10, opacity: 0.75, fontFeatureSettings: '"tnum"' }}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DateStrip({
  archive,
  currentDate,
  onChange,
}: {
  archive: string[];
  currentDate: string | null;
  onChange: (d: string) => void;
}) {
  return (
    <div
      style={{
        padding: "0 16px 12px",
        display: "flex",
        gap: 6,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {archive.map((d) => {
        const dt = new Date(d);
        const wd = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
        const active = d === currentDate;
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            style={{
              flex: "0 0 auto",
              padding: "8px 12px",
              borderRadius: 10,
              background: active ? "var(--fg)" : "var(--bg-sunken)",
              color: active ? "var(--bg)" : "var(--fg-muted)",
              border: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              minWidth: 48,
            }}
          >
            <span style={{ fontSize: 10, opacity: 0.7 }}>{wd}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{dt.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
