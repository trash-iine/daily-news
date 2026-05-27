"use client";
import { useState, type CSSProperties } from "react";
import type { BaseItem, BigTagGroup } from "@daily-news/shared";
import { BIG_COLOR, BIG_TAGS, bigTagOf } from "../lib/bigTags";
import { FAM_COLOR, FAM_GLYPH, sourceFamily } from "../lib/sources";

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
