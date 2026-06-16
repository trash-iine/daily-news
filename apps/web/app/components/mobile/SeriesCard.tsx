"use client";
import { useMemo } from "react";
import type {
  BaseItem,
  BigTagGroup,
  DailyBundle,
} from "@daily-news/shared";
import { BIG_COLOR, bigTagOf } from "./lib/bigTags";
import { sourceLabel } from "./lib/sources";
import { fmtDateBadge } from "./lib/format";
import { dateRange, risingTags, type RisingTag } from "./lib/trend";
import { Tag } from "./atoms/badges";

/**
 * 続いている話題カード (改善案 ⑤)。
 *
 * Recap の `risingTags()` を Today 画面でも使い、直近 7 日で 3 日以上連続して
 * 出ているタグを 1〜2 個カード化する。big タグそのもの (ai / hobby など) は
 * 粒度が粗すぎて常時 hit するので除外。
 *
 * カードからは
 * - そのタグを含む各日付の代表記事タイトル (3 件 = 直近 3 日)
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

interface SeriesEntry {
  tag: string;
  bigGroup: BigTagGroup | null;
  ratio: number;
  /** 直近 N 日 (古い→新しい順)。それぞれの日の代表 item (なければ null)。 */
  days: { date: string; item: BaseItem | null }[];
  /** 今日の代表 item (jump 先)。 */
  todayItem: BaseItem;
}

/**
 * Today 画面で出すべき "続いている話題" を抽出する。
 *
 * 条件:
 * - 直近 7 日で出ているタグ
 * - 今日 (latestDate) にもそのタグの item がある (= jump 先がある)
 * - 過去 3 日のうち 2 日以上に出ている (連続性)
 * - big タグそのもの (ai / hobby など) は除外 (粒度が粗いので)
 *
 * ratio が大きい順に最大 2 件返す。
 */
function detectSeries(
  bundles: Record<string, DailyBundle>,
  latestDate: string,
  todayItems: BaseItem[],
): SeriesEntry[] {
  const dates = dateRange(latestDate, 7);
  if (dates.length < 3) return [];

  // 今日のタグ集合 (jump 先の存在保証 + 「今もホット」のフィルタ)。
  // 「続いている話題」はニュース記事ベースで判定するため論文は数えない。
  const todayTags = new Set<string>();
  for (const it of todayItems) {
    if (it.kind === "paper") continue;
    for (const t of it.tags) todayTags.add(t);
  }

  // risingTags は「直近 N/2 日 vs それ以前」で比較するので、minRecent=2 だと
  // 今日 + 昨日に 1 件ずつ出ただけでも拾ってしまう。連続性を担保するため
  // 3 日以上で minRecent=2 を満たし、かつ今日に存在するものに絞る。
  const rising = risingTags(bundles, dates, {
    minRecent: 2,
    topN: 16,
    filter: (it) => it.kind !== "paper",
  });
  const candidates = rising.filter((r): r is RisingTag => {
    if (!todayTags.has(r.tag)) return false;
    // big タグ ID そのもの (ai / hobby など) は粒度が粗いので除外
    if (bigTagOf(r.tag) && (r.tag === "ai" || r.tag === "hobby")) return false;
    // 直近 3 日 (= series 末尾 3 要素) のうち 2 日以上に出現することを要求
    const last3 = r.series.slice(-3);
    const daysActive = last3.filter((c) => c > 0).length;
    return daysActive >= 2;
  });

  const out: SeriesEntry[] = [];
  for (const r of candidates) {
    const todayItem = pickRepresentative(todayItems, r.tag);
    if (!todayItem) continue;
    const days = dates.slice(-3).map((d) => ({
      date: d,
      item: pickRepresentative(bundles[d]?.items ?? [], r.tag),
    }));
    out.push({
      tag: r.tag,
      bigGroup: r.bigGroup,
      ratio: r.ratio,
      days,
      todayItem,
    });
    if (out.length >= 2) break;
  }
  return out;
}

/** タグを含むニュース記事のうち score 最大のものを返す (論文は代表にしない)。 */
function pickRepresentative(items: BaseItem[], tag: string): BaseItem | null {
  let best: BaseItem | null = null;
  for (const it of items) {
    if (it.kind === "paper") continue;
    if (!it.tags.includes(tag)) continue;
    if (!best || it.score > best.score) best = it;
  }
  return best;
}

function SeriesRow({
  s,
  onJump,
}: {
  s: SeriesEntry;
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}) {
  const color = s.bigGroup
    ? BIG_COLOR[s.bigGroup]
    : "oklch(0.55 0.02 60)";
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
          直近 {countActiveDays(s.days)} 日で {s.days.length} 件続けて登場
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
        {item ? item.title : "—"}
      </div>
    </div>
  );
}
