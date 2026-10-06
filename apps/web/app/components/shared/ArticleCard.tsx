"use client";
import type { BaseItem } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import { BIG_TAG_DEF, itemBigTags } from "./lib/bigTags";
import {
  displayAuthors,
  fmtRel,
  hostFromUrl,
  pdfUrlOf,
  stripForPreview,
} from "./lib/format";
import { Tag, Thumb } from "./badges";
import { ExternalLink } from "./ExternalLink";
import { ItemMetaRow } from "./ItemMetaRow";
import { OpenOriginalButton, SummaryBox } from "./ItemDetail";
import { ScoreBreakdown, hasBreakdown } from "./ScoreBreakdown";
import { NEUTRAL_SCORE_COLOR, ScoreBar } from "./ScoreBar";
import { PaperLinkButton } from "./PaperLinkButton";

export function ArticleCard({
  item,
  expanded,
  onToggle,
  nowMs,
  highlighted,
  scoreScale,
}: {
  item: BaseItem;
  /** 論文のみ有効。ニュースは展開を持たないので無視される。 */
  expanded: boolean;
  onToggle: () => void;
  nowMs: number;
  /** 続いている話題カードから jump してきた直後の一時ハイライト。 */
  highlighted?: boolean;
  /** ニュース評価バーの分母 (リスト内の最大 news score)。lib/bundle の newsScoreScale。 */
  scoreScale: number;
}) {
  const big = itemBigTags(item)[0];
  const bigColor = big ? BIG_TAG_DEF[big].color : "var(--border)";
  const isPaper = item.kind === "paper";
  /** 展開は論文だけの機能。ニュースはカードタップで直接元記事へ飛ぶ。 */
  const isOpen = isPaper && expanded;
  const pdf = pdfUrlOf(item);
  const authors = displayAuthors(item);

  /** 論文はトグルボタン、ニュースは元記事へのリンクとして包む共通の本文。 */
  const body = (
    <div style={{ minWidth: 0 }}>
      <ItemMetaRow item={item} big={big} />
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15.5,
          fontWeight: 500,
          lineHeight: 1.4,
          margin: "0 0 6px",
          letterSpacing: "-0.005em",
        }}
      >
        {item.title}
      </h3>
      {/* コラプス時プレビュー: 論文で topic があれば「技術と問題」の 1 文を、
          無ければ従来どおり summary の冒頭を表示する。 */}
      {!isOpen && (item.summaryStruct?.topic || item.summary) && (
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
          {item.summaryStruct?.topic ?? stripForPreview(item.summary)}
        </p>
      )}
      {/* 論文: 著者行 + abs/PDF ボタン (コラプス時のみ) */}
      {isPaper && !isOpen && (authors || pdf) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            margin: "0 0 6px",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--fg-faint)",
          }}
        >
          {authors && (
            <span
              style={{
                color: "var(--fg-muted)",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {authors.join(" · ")}
            </span>
          )}
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
            <PaperLinkButton href={item.url} variant="abs" />
            {pdf && <PaperLinkButton href={pdf} variant="pdf" />}
          </span>
        </div>
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
  );

  const bodyStyle = {
    background: "none",
    border: 0,
    padding: 0,
    textAlign: "left",
    width: "100%",
    minWidth: 0,
    cursor: "pointer",
    color: "inherit",
    fontFamily: "inherit",
  } as const;

  return (
    <article
      id={`item-${item.id}`}
      data-kind={item.kind}
      style={{
        padding: "14px 18px",
        borderTop: "0.5px solid var(--rule)",
        background: highlighted
          ? `color-mix(in oklch, ${bigColor} 9%, transparent)`
          : isOpen
            ? "var(--bg-sunken)"
            : "transparent",
        borderLeft: `2px solid ${big ? bigColor : "transparent"}`,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "start",
        transition: "background 0.4s",
        scrollMarginTop: 12,
      }}
    >
      {isPaper ? (
        <button onClick={onToggle} aria-expanded={isOpen} style={bodyStyle}>
          {body}
        </button>
      ) : (
        <ExternalLink
          href={item.url}
          aria-label={`元記事を開く: ${item.title}`}
          style={{ ...bodyStyle, display: "block", textDecoration: "none" }}
        >
          {body}
        </ExternalLink>
      )}
      <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
        {/* ニュースは本文全体が同じリンクなので、サムネイルは支援技術から隠して読み上げの重複を防ぐ。 */}
        <ExternalLink
          href={item.url}
          aria-label={isPaper ? `元記事を開く: ${item.title}` : undefined}
          aria-hidden={isPaper ? undefined : true}
          tabIndex={isPaper ? undefined : -1}
          style={{ display: "block", lineHeight: 0 }}
        >
          <Thumb item={item} size={64} />
        </ExternalLink>
      </div>
      {!isPaper && (
        <ScoreBar
          item={item}
          scale={scoreScale}
          color={big ? bigColor : NEUTRAL_SCORE_COLOR}
          style={{ gridColumn: "1 / -1" }}
        />
      )}
      {isOpen && (
        <div style={{ gridColumn: "1 / -1", marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
          {(authors || pdf) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              {authors && (
                <span style={{ color: "var(--fg-muted)", lineHeight: 1.4 }}>
                  {authors.join(" · ")}
                </span>
              )}
              <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6 }}>
                <PaperLinkButton href={item.url} variant="abs" />
                {pdf && <PaperLinkButton href={pdf} variant="pdf" />}
              </span>
            </div>
          )}
          <SummaryBox item={item} padding={14} />
          {hasBreakdown(item) && <ScoreBreakdown item={item} />}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-faint)", marginBottom: 12 }}>
            {hostFromUrl(item.url)}
          </div>
          <OpenOriginalButton href={item.url} />
        </div>
      )}
    </article>
  );
}
