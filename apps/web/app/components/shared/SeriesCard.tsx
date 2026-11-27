"use client";
import { useMemo } from "react";
import type { BaseItem, DailyBundle } from "@daily-news/shared";
import { BIG_TAG_DEF } from "./lib/bigTags";
import { sourceLabel } from "./lib/sources";
import { fmtDateBadge } from "./lib/format";
import { detectSeries, type SeriesEntry } from "./lib/series";
import { ExternalLink } from "./ExternalLink";
import { Tag } from "./badges";
import { NEUTRAL_SCORE_COLOR } from "./ScoreBar";

/**
 * 続いている話題カード (改善案 ⑤)。
 *
 * Recap の `risingTags()` を Today 画面でも使い、直近 7 日で 3 日以上連続して
 * 出ているタグを 1〜2 個カード化する。big タグそのもの (ai / hobby など) は
 * 粒度が粗すぎて常時 hit するので除外。
 *
 * カードからは
 * - そのタグを含む各日付の代表記事タイトル (3 件 = 直近 3 日、元記事へのリンクつき)
 * - 今日の代表記事への jump ボタン
 * を出す。jump 先は `onJump` で親に伝え、ArticleCard の highlighted を点灯させる。
 */
export function SeriesCard({
  bundles,
  latestDate,
  todayItems,
  onJump,
}: {
  bundles: Record<string, DailyBundle>;
  latestDate: string;
  todayItems: BaseItem[];
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}) {
  const series = useMemo(
    () => detectSeries(bundles, latestDate, todayItems),
    [bundles, latestDate, todayItems],
  );
  if (series.length === 0) return null;
  return (
    <div style={{ padding: "10px 12px 14px", display: "grid", gap: 10 }}>
      {series.map((s) => (
        <SeriesRow key={s.tag} s={s} onJump={onJump} />
      ))}
    </div>
  );
}

function SeriesRow({
  s,
  onJump,
}: {
  s: SeriesEntry;
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}) {
  const color = s.bigGroup ? BIG_TAG_DEF[s.bigGroup].color : NEUTRAL_SCORE_COLOR;
  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: "0.5px solid var(--border)",
        borderLeft: `3px solid ${color}`,
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            letterSpacing: "0.14em",
            color: "var(--fg-faint)",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          続いている話題
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color,
            fontWeight: 700,
          }}
        >
          ×{s.ratio.toFixed(1)}↑
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Tag t={s.tag} />
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13,
            color: "var(--fg-muted)",
            lineHeight: 1.4,
          }}
        >
          直近 {s.days.length} 日で {countActiveDays(s.days)} 件続けて登場
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 4,
          padding: "6px 0",
          borderTop: "0.5px dashed var(--border)",
          marginBottom: 8,
        }}
      >
        {s.days.map((d, i) => (
          <DayCell
            key={d.date}
            date={d.date}
            item={d.item}
            isToday={i === s.days.length - 1}
            color={color}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-faint)",
          }}
        >
          {sourceLabel(s.todayItem.source)}
        </span>
        <button
          type="button"
          onClick={() => onJump(s.todayItem.id, s.todayItem.kind)}
          style={{
            appearance: "none",
            border: "0.5px solid var(--border)",
            background: "var(--bg-sunken)",
            color: "var(--fg-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.02em",
            padding: "5px 9px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          今日の記事を見る →
        </button>
      </div>
    </div>
  );
}

function countActiveDays(days: SeriesEntry["days"]): number {
  return days.filter((d) => d.item !== null).length;
}

function DayCell({
  date,
  item,
  isToday,
  color,
}: {
  date: string;
  item: BaseItem | null;
  isToday: boolean;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "5px 7px",
        borderRadius: 6,
        background: isToday
          ? `color-mix(in oklch, ${color} 12%, transparent)`
          : "transparent",
        border: isToday
          ? `0.5px solid color-mix(in oklch, ${color} 35%, transparent)`
          : "0.5px solid var(--rule)",
        opacity: item ? 1 : 0.4,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          fontWeight: 700,
          color: isToday ? color : "var(--fg-faint)",
          marginBottom: 2,
          fontFeatureSettings: '"tnum"',
        }}
      >
        {fmtDateBadge(date)}
      </div>
      <div
        style={{
          fontSize: 9.5,
          lineHeight: 1.3,
          color: "var(--fg-muted)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {item ? (
          <ExternalLink
            href={item.url}
            title={item.title}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {item.title}
          </ExternalLink>
        ) : (
          "—"
        )}
      </div>
    </div>
  );
}
