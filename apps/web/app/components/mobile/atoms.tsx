"use client";
import { useState, type CSSProperties } from "react";
import type { BaseItem, BigTagGroup } from "@daily-news/shared";
import { BIG_COLOR, BIG_TAGS, FAM_COLOR, FAM_GLYPH, bigTagOf, sourceFamily } from "./lib";

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

export function Thumb({
  item,
  size = 56,
}: {
  item: Pick<BaseItem, "thumbnail" | "source">;
  size?: number;
}) {
  const fam = sourceFamily(item.source);
  const c = FAM_COLOR[fam] ?? FAM_COLOR.other;
  const glyph = FAM_GLYPH[fam] ?? FAM_GLYPH.other;
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.18);
  const baseStyle: CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: radius,
    overflow: "hidden",
    position: "relative",
    border: `0.5px solid color-mix(in oklch, ${c} 22%, var(--border))`,
  };
  if (item.thumbnail && !failed) {
    return (
      <div style={baseStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div
          style={{
            position: "absolute",
            left: 4,
            bottom: 4,
            padding: "1px 5px",
            borderRadius: 3,
            background: `color-mix(in oklch, ${c} 90%, black)`,
            color: "white",
            fontFamily: "var(--font-mono)",
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: 0.2,
            lineHeight: 1.2,
          }}
        >
          {glyph}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        ...baseStyle,
        background: `linear-gradient(135deg, color-mix(in oklch, ${c} 18%, var(--bg-elev)), color-mix(in oklch, ${c} 8%, var(--bg-sunken)))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: size * 0.42,
          fontWeight: 700,
          color: c,
          letterSpacing: -0.5,
        }}
      >
        {glyph}
      </span>
    </div>
  );
}

/**
 * 採択理由バッジ (トレンド指標)。value が >0 のときだけ表示。
 * 呼び出し側が popularity (生の人気) か trendScore (時間正規化済み) を選んで渡す。
 * tooltip に popularityLabel (Qiita LGTM N など) を載せる。
 */
export function PopularityBadge({
  value,
  label,
  sm,
}: {
  value: number;
  label?: string;
  sm?: boolean;
}) {
  if (value <= 0) return null;
  const c = "oklch(0.62 0.18 15)";
  return (
    <span
      title={label ? `トレンド: ${label} (指標 ${value})` : `トレンド指標 ${value}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: sm ? "1px 5px" : "2px 7px",
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        fontSize: sm ? 10 : 11,
        fontWeight: 700,
        background: `color-mix(in oklch, ${c} 12%, transparent)`,
        color: `color-mix(in oklch, ${c} 70%, var(--fg))`,
        border: `0.5px solid color-mix(in oklch, ${c} 30%, transparent)`,
        whiteSpace: "nowrap",
        fontFeatureSettings: '"tnum"',
      }}
    >
      ♡{value}
    </span>
  );
}

/**
 * 採択理由バッジ (自分の興味)。keywordScore が >0 のときだけ表示。
 * tooltip にマッチした keyword を載せる。
 */
export function InterestBadge({
  value,
  matched,
  sm,
}: {
  value: number;
  matched?: string[];
  sm?: boolean;
}) {
  if (value <= 0) return null;
  const c = "oklch(0.68 0.16 80)";
  const tip =
    matched && matched.length > 0
      ? `興味マッチ: ${matched.join(", ")} (加点 ${value})`
      : `興味スコア ${value}`;
  return (
    <span
      title={tip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: sm ? "1px 5px" : "2px 7px",
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        fontSize: sm ? 10 : 11,
        fontWeight: 700,
        background: `color-mix(in oklch, ${c} 14%, transparent)`,
        color: `color-mix(in oklch, ${c} 65%, var(--fg))`,
        border: `0.5px solid color-mix(in oklch, ${c} 32%, transparent)`,
        whiteSpace: "nowrap",
        fontFeatureSettings: '"tnum"',
      }}
    >
      ★{value}
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
