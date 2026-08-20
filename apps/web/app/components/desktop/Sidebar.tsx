"use client";
import type { CSSProperties, ReactNode } from "react";
import type { BigTagGroup, DailyBundle } from "@daily-news/shared";
import { NAV_ITEMS, type TabId } from "../shared/lib/nav";
import { WEEKDAY_MON_SUN, buildWeekSlots } from "../shared/lib/today";
import { BIG_TAGS } from "../shared/lib/bigTags";
import { weekdayJa } from "../shared/lib/format";

/**
 * デスクトップ左カラム。ブランド + 縦ナビ + 週カレンダー + 大タグフィルタ。
 * 週カレンダー / 大タグフィルタは Today タブのときだけ出す。
 */
export function Sidebar({
  archive,
  currentDate,
  setCurrentDate,
  tab,
  setTab,
  bundle,
  counts,
  bigFilter,
  setBigFilter,
}: {
  archive: string[];
  currentDate: string | null;
  setCurrentDate: (d: string) => void;
  tab: TabId;
  setTab: (t: TabId) => void;
  bundle: DailyBundle | null;
  counts: Record<string, number>;
  bigFilter: BigTagGroup | null;
  setBigFilter: (g: BigTagGroup | null) => void;
}) {
  const date = bundle ? new Date(bundle.date) : null;
  const paperCount = counts.paper ?? 0;
  const total = counts.all ?? 0;

  return (
    <div style={{ padding: "20px 16px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.14em",
            color: "var(--fg-faint)",
            textTransform: "uppercase",
          }}
        >
          {date
            ? `${date.getFullYear()} · ${String(date.getMonth() + 1).padStart(2, "0")}/${String(
                date.getDate(),
              ).padStart(2, "0")} (${weekdayJa(date)})`
            : "—"}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            margin: "2px 0 0",
            lineHeight: 1.15,
          }}
        >
          Daily Digest
        </h1>
        {bundle && (
          <div
            style={{
              marginTop: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-faint)",
              fontFeatureSettings: '"tnum"',
            }}
          >
            {total} items · {total - paperCount} N · {paperCount} P
          </div>
        )}
      </div>

      <nav style={{ display: "grid", gap: 2 }}>
        {NAV_ITEMS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                border: 0,
                cursor: "pointer",
                textAlign: "left",
                background: active ? "var(--fg)" : "transparent",
                color: active ? "var(--bg)" : "var(--fg-muted)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, lineHeight: 1 }}>
                {t.glyph}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "today" && (
        <>
          <WeekRail archive={archive} currentDate={currentDate} onChange={setCurrentDate} />
          <BigTagRail value={bigFilter} onChange={setBigFilter} counts={counts} />
        </>
      )}
    </div>
  );
}

/** Mon-Sun 7 マス。mobile の WeekStrip と同じリング計算 (buildWeekSlots) を使う。 */
function WeekRail({
  archive,
  currentDate,
  onChange,
}: {
  archive: string[];
  currentDate: string | null;
  onChange: (d: string) => void;
}) {
  const slots = buildWeekSlots(archive);
  if (slots.length !== 7 || !currentDate) return null;
  return (
    <div>
      <SectionLabel>Week</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {slots.map((slot, i) => {
          const active = slot.iso === currentDate;
          return (
            <button
              key={slot.iso}
              disabled={!slot.inArchive}
              onClick={() => onChange(slot.iso)}
              title={slot.iso}
              style={{
                padding: "6px 0",
                borderRadius: 8,
                background: active ? "var(--fg)" : "var(--bg-sunken)",
                color: active ? "var(--bg)" : "var(--fg-muted)",
                border: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                cursor: slot.inArchive ? "pointer" : "default",
                opacity: slot.inArchive ? 1 : 0.35,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <span style={{ fontSize: 8.5, opacity: 0.7 }}>{WEEKDAY_MON_SUN[i]}</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{slot.date}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 大タグフィルタ。mobile の BigTagFilter と同じ選択肢を、横スクロールでなく縦積みで出す。 */
function BigTagRail({
  value,
  onChange,
  counts,
}: {
  value: BigTagGroup | null;
  onChange: (v: BigTagGroup | null) => void;
  counts: Record<string, number>;
}) {
  return (
    <div>
      <SectionLabel>Filter</SectionLabel>
      <div style={{ display: "grid", gap: 3 }}>
        <button
          onClick={() => onChange(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 8,
            border: 0,
            cursor: "pointer",
            background: value === null ? "var(--fg)" : "var(--bg-sunken)",
            color: value === null ? "var(--bg)" : "var(--fg-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          ALL
          <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.75, fontFeatureSettings: '"tnum"' }}>
            {counts.all ?? 0}
          </span>
        </button>
        {BIG_TAGS.map((t) => {
          const active = value === t.id;
          const n = counts[t.id] || 0;
          const dim = n === 0;
          const skin: CSSProperties = active
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
              title={t.desc}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 10px",
                borderRadius: 8,
                cursor: dim ? "default" : "pointer",
                opacity: dim ? 0.4 : 1,
                fontSize: 12,
                fontWeight: 600,
                ...skin,
              }}
            >
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.85 }}>
                {t.emoji}
              </span>
              {t.label}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  opacity: 0.75,
                  fontFamily: "var(--font-mono)",
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--fg-faint)",
        fontWeight: 600,
        marginBottom: 7,
      }}
    >
      {children}
    </div>
  );
}
