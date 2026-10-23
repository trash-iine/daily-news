"use client";
import type { BaseItem, BigTagGroup } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import { FAM_COLOR, sourceFamily, sourceLabel } from "./lib/sources";
import { trendScore } from "./lib/trend";
import { BigTagPill, InterestBadge, PopularityBadge } from "./badges";
import { hasBreakdown } from "./ScoreBreakdown";

/**
 * カード / リスト行 / 詳細ペイン共通のメタ行。
 * 大タグ・論文/NEWS・話題・ソース名と、右寄せの ♡ / ★ バッジを並べる。
 * `detail` は右ペイン用: ピルを一回り大きくし、スコアバッジは ScoreBreakdown に任せて出さない。
 */
export function ItemMetaRow({
  item,
  big,
  detail,
}: {
  item: BaseItem;
  big: BigTagGroup | undefined;
  detail?: boolean;
}) {
  const isPaper = item.kind === "paper";
  const pillPad = detail ? "2px 7px" : "1px 6px";
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        marginBottom: detail ? 8 : 6,
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--fg-faint)",
        flexWrap: "wrap",
      }}
    >
      {big && <BigTagPill id={big} sm={!detail} />}
      <span
        style={{
          padding: pillPad,
          borderRadius: 3,
          fontWeight: 700,
          background: isPaper
            ? "color-mix(in oklch, oklch(0.58 0.13 50) 14%, transparent)"
            : "color-mix(in oklch, oklch(0.55 0.13 240) 14%, transparent)",
          color: isPaper ? "oklch(0.5 0.13 50)" : "oklch(0.5 0.13 240)",
        }}
      >
        {isPaper ? "論文" : "NEWS"}
      </span>
      {item.venue && <VenuePill item={item} pad={pillPad} />}
      {item.tags.includes(TRENDING_TAG) && (
        <span
          style={{
            padding: pillPad,
            borderRadius: 3,
            fontWeight: 700,
            background: "color-mix(in oklch, oklch(0.65 0.17 35) 16%, transparent)",
            color: "oklch(0.52 0.17 35)",
          }}
        >
          話題
        </span>
      )}
      <span style={{ color: FAM_COLOR[sourceFamily(item.source)], fontWeight: 500 }}>
        {sourceLabel(item.source)}
      </span>
      {!detail && (
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4, alignItems: "center" }}>
          {(item.popularity ?? 0) > 0 && (
            <PopularityBadge value={trendScore(item)} label={item.popularityLabel} sm />
          )}
          {(item.keywordScore ?? 0) > 0 && (
            <InterestBadge value={item.keywordScore ?? 0} matched={item.matchedKeywords} sm />
          )}
          {/* 旧データには内訳が無いため score のみ表示 */}
          {!hasBreakdown(item) && <span>★{item.score}</span>}
        </span>
      )}
    </div>
  );
}

/** 採択会議・掲載誌のピル。会議採択論文は会議別ページ (/venues/{slug}) へのリンクにする。 */
function VenuePill({ item, pad }: { item: BaseItem; pad: string }) {
  const color = "oklch(0.55 0.15 300)";
  const style = {
    padding: pad,
    borderRadius: 3,
    fontWeight: 700,
    background: `color-mix(in oklch, ${color} 14%, transparent)`,
    color: `color-mix(in oklch, ${color} 80%, var(--fg))`,
    textDecoration: "none",
  } as const;
  if (!item.venueSlug) return <span style={style}>{item.venue}</span>;
  return (
    <a
      href={`/venues/${item.venueSlug}`}
      // カード展開 / 選択のクリックと競合させない
      onClick={(e) => e.stopPropagation()}
      style={style}
    >
      {item.venue}
    </a>
  );
}
