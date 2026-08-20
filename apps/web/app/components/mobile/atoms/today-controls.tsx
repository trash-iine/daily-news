"use client";
import type { CSSProperties } from "react";
import type { BigTagGroup } from "@daily-news/shared";
import { BIG_TAGS } from "../../shared/lib/bigTags";
import { WEEKDAY_MON_SUN, buildWeekSlots } from "../../shared/lib/today";

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

/**
 * Mon-Sun 固定 7 スロットの週ストリップ。archive[0] (最新日) を末尾とする直近 7 日を
 * 各曜日スロットに配置するリングバッファ表示。archive に無い日は disabled。
 */
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
