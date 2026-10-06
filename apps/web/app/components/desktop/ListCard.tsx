"use client";
import { memo } from "react";
import type { BaseItem } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import { BIG_TAG_DEF, itemBigTags } from "../shared/lib/bigTags";
import { fmtRel, stripForPreview } from "../shared/lib/format";
import { Tag, Thumb } from "../shared/badges";
import { ItemMetaRow } from "../shared/ItemMetaRow";
import { NEUTRAL_SCORE_COLOR, ScoreBar } from "../shared/ScoreBar";

/**
 * デスクトップ中央ペインの 1 行。ArticleCard のコラプス状態に相当するが、
 * クリックは論文/ニュースを問わず「右ペインで選択」に統一されている
 * (ArticleCard の「論文=トグル / ニュース=外部リンク」分岐は持たない)。
 *
 * DOM id は mobile の ArticleCard (`item-*`) と衝突しないよう `d-item-*`。
 */
export const ListCard = memo(function ListCard({
  item,
  selected,
  onSelect,
  nowMs,
  scoreScale,
}: {
  item: BaseItem;
  selected: boolean;
  /** 行ごとのクロージャを作らず memo を効かせるため、id を受け取る形にしている。 */
  onSelect: (id: string) => void;
  nowMs: number;
  scoreScale: number;
}) {
  const big = itemBigTags(item)[0];
  const bigColor = big ? BIG_TAG_DEF[big].color : "var(--border)";
  const isPaper = item.kind === "paper";
  const preview = item.summaryStruct?.topic ?? (item.summary ? stripForPreview(item.summary) : "");

  return (
    <div
      id={`d-item-${item.id}`}
      aria-current={selected ? "true" : undefined}
      onClick={() => onSelect(item.id)}
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
        <ItemMetaRow item={item} big={big} />
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
});
