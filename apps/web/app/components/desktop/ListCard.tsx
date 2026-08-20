"use client";
import type { BaseItem } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import { BIG_COLOR, itemBigTags } from "../shared/lib/bigTags";
import { FAM_COLOR, sourceFamily, sourceLabel } from "../shared/lib/sources";
import { fmtRel, stripForPreview } from "../shared/lib/format";
import { trendScore } from "../shared/lib/trend";
import { BigTagPill, InterestBadge, PopularityBadge, Tag, Thumb } from "../shared/badges";
import { NEUTRAL_SCORE_COLOR, ScoreBar } from "../shared/ScoreBar";

/**
 * デスクトップ中央ペインの 1 行。ArticleCard のコラプス状態に相当するが、
 * クリックは論文/ニュースを問わず「右ペインで選択」に統一されている
 * (ArticleCard の「論文=トグル / ニュース=外部リンク」分岐は持たない)。
 *
 * DOM id は mobile の ArticleCard (`item-*`) と衝突しないよう `d-item-*`。
 */
export function ListCard({
  item,
  selected,
  onSelect,
  nowMs,
  scoreScale,
}: {
  item: BaseItem;
  selected: boolean;
  onSelect: () => void;
  nowMs: number;
  scoreScale: number;
}) {
  const fam = sourceFamily(item.source);
  const big = itemBigTags(item)[0];
  const bigColor = big ? BIG_COLOR[big] : "var(--border)";
  const isTrending = item.tags.includes(TRENDING_TAG);
  const isPaper = item.kind === "paper";
  const preview = item.summaryStruct?.topic ?? (item.summary ? stripForPreview(item.summary) : "");

  return (
    <div
      id={`d-item-${item.id}`}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className="dlist-row"
      data-selected={selected ? "true" : undefined}
      style={{
        padding: "13px 20px",
        borderTop: "0.5px solid var(--rule)",
        borderLeft: `3px solid ${selected ? bigColor : big ? `color-mix(in oklch, ${bigColor} 45%, transparent)` : "transparent"}`,
        background: selected ? "var(--bg-sunken)" : "transparent",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "start",
        cursor: "pointer",
        scrollMarginTop: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            marginBottom: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--fg-faint)",
            flexWrap: "wrap",
          }}
        >
          {big && <BigTagPill id={big} sm />}
          <span
            style={{
              padding: "1px 6px",
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
          {isTrending && (
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 3,
                fontWeight: 700,
                background: "color-mix(in oklch, oklch(0.65 0.17 35) 16%, transparent)",
                color: "oklch(0.52 0.17 35)",
              }}
            >
              話題
            </span>
          )}
          <span style={{ color: FAM_COLOR[fam], fontWeight: 500 }}>{sourceLabel(item.source)}</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4, alignItems: "center" }}>
            {item.popularity !== undefined && item.popularity > 0 && (
              <PopularityBadge value={trendScore(item)} label={item.popularityLabel} sm />
            )}
            {item.keywordScore !== undefined && item.keywordScore > 0 && (
              <InterestBadge value={item.keywordScore} matched={item.matchedKeywords} sm />
            )}
            {/* 旧データには内訳が無いため score のみ表示 */}
            {item.popularity === undefined && item.keywordScore === undefined && (
              <span>★{item.score}</span>
            )}
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.4,
            margin: "0 0 6px",
            letterSpacing: "-0.005em",
          }}
        >
          {item.title}
        </h3>
        {preview && (
          <p
            style={{
              fontSize: 12.5,
              color: "var(--fg-muted)",
              lineHeight: 1.55,
              margin: "0 0 8px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {preview}
          </p>
        )}
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          {item.tags
            .filter((t) => t !== TRENDING_TAG)
            .slice(0, 4)
            .map((t) => (
              <Tag key={t} t={t} sm />
            ))}
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--fg-faint)",
            }}
          >
            {fmtRel(item.publishedAt, nowMs)}
          </span>
        </div>
      </div>
      <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
        <Thumb item={item} size={64} />
      </div>
      {!isPaper && (
        <ScoreBar
          item={item}
          scale={scoreScale}
          color={big ? bigColor : NEUTRAL_SCORE_COLOR}
          style={{ gridColumn: "1 / -1" }}
        />
      )}
    </div>
  );
}
