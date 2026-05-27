"use client";
import type { BaseItem } from "@daily-news/shared";
import {
  BIG_COLOR,
  FAM_COLOR,
  displayAuthors,
  fmtRel,
  hostFromUrl,
  itemBigTags,
  pdfUrlOf,
  sourceFamily,
  sourceLabel,
  stripForPreview,
  trendScore,
} from "./lib";
import { BigTagPill, InterestBadge, PopularityBadge, Tag, Thumb } from "./atoms";
import { ExternalLink } from "./ExternalLink";
import { SummaryMarkdown } from "./SummaryMarkdown";
import { PaperSummaryStruct } from "./PaperSummaryStruct";

export function ArticleCard({
  item,
  expanded,
  onToggle,
  saved,
  onSave,
  nowMs,
  highlighted,
}: {
  item: BaseItem;
  expanded: boolean;
  onToggle: () => void;
  saved: boolean;
  onSave: () => void;
  nowMs: number;
  /** Brief カルーセルから jump してきた直後の一時ハイライト。 */
  highlighted?: boolean;
}) {
  const fam = sourceFamily(item.source);
  const big = itemBigTags(item)[0];
  const bigColor = big ? BIG_COLOR[big] : "var(--border)";
  const isPaper = item.kind === "paper";
  const pdf = pdfUrlOf(item);
  const authors = displayAuthors(item);
  return (
    <article
      id={`item-${item.id}`}
      data-kind={item.kind}
      style={{
        padding: "14px 18px",
        borderTop: "0.5px solid var(--rule)",
        background: highlighted
          ? `color-mix(in oklch, ${bigColor} 9%, transparent)`
          : expanded
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
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          background: "none",
          border: 0,
          padding: 0,
          textAlign: "left",
          width: "100%",
          minWidth: 0,
          cursor: "pointer",
          color: "inherit",
          fontFamily: "inherit",
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
            <span style={{ color: FAM_COLOR[fam], fontWeight: 500 }}>{sourceLabel(item.source)}</span>
            <span
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
              }}
            >
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
              fontSize: 15.5,
              fontWeight: 500,
              lineHeight: 1.4,
              margin: "0 0 6px",
              letterSpacing: "-0.005em",
            }}
          >
            {item.title}
          </h3>
          {!expanded && item.summary && (
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
              {stripForPreview(item.summary)}
            </p>
          )}
          {/* 論文: 著者行 + abs/PDF ボタン (コラプス時のみ) */}
          {isPaper && !expanded && (authors || pdf) && (
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
                <PaperLinkButton href={item.url} variant="abs" label="abs" />
                {pdf && <PaperLinkButton href={pdf} variant="pdf" label="PDF" />}
              </span>
            </div>
          )}
          <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
            {item.tags.slice(0, 4).map((t) => (
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
      </button>
      <ExternalLink
        href={item.url}
        aria-label={`元記事を開く: ${item.title}`}
        style={{ display: "block", lineHeight: 0 }}
      >
        <Thumb item={item} size={64} />
      </ExternalLink>
      {expanded && (
        <div style={{ gridColumn: "1 / -1", marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
          {isPaper && (authors || pdf) && (
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
                <PaperLinkButton href={item.url} variant="abs" label="abs" />
                {pdf && <PaperLinkButton href={pdf} variant="pdf" label="PDF" />}
              </span>
            </div>
          )}
          {item.summary && (
            <div
              style={{
                padding: 14,
                marginBottom: 12,
                borderRadius: 10,
                background: isPaper
                  ? "color-mix(in oklch, oklch(0.58 0.13 50) 6%, var(--bg-elev))"
                  : "var(--bg-elev)",
                border: "0.5px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  color: "var(--fg-faint)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {isPaper ? "✦ AI 要約" : "概要"}
              </div>
              {isPaper && item.summaryStruct ? (
                <PaperSummaryStruct s={item.summaryStruct} />
              ) : (
                <SummaryMarkdown source={item.summary} />
              )}
            </div>
          )}
          {hasBreakdown(item) && <ScoreBreakdown item={item} />}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-faint)", marginBottom: 12 }}>
            {hostFromUrl(item.url)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <ExternalLink
              href={item.url}
              style={{
                padding: "11px 14px",
                background: "var(--fg)",
                color: "var(--bg)",
                borderRadius: 10,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              ↗ 元記事を開く
            </ExternalLink>
            <button
              onClick={onSave}
              style={{
                padding: "11px 16px",
                background: saved ? "oklch(0.7 0.16 80)" : "var(--bg-elev)",
                border: `0.5px solid ${saved ? "oklch(0.7 0.16 80)" : "var(--border)"}`,
                color: saved ? "white" : "var(--fg)",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
              }}
            >
              {saved ? "★ 保存済" : "★ 保存"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function hasBreakdown(item: BaseItem): boolean {
  return (
    item.popularity !== undefined ||
    item.keywordScore !== undefined ||
    item.languageBonus !== undefined
  );
}

/**
 * 採択理由 (なぜこの記事が選ばれたか) を内訳で示すブロック。
 * トレンド / 興味マッチ / 言語ボーナスの寄与を読み取れるようにする。
 */
function ScoreBreakdown({ item }: { item: BaseItem }) {
  const pop = item.popularity ?? 0;
  const kw = item.keywordScore ?? 0;
  const lang = item.languageBonus ?? 0;
  const total = pop + kw + lang;
  const trend = trendScore(item);
  const matched = item.matchedKeywords ?? [];
  const popSub = pop > 0
    ? item.popularityLabel
      ? `${item.popularityLabel} (正規化 ${pop} / 速度補正 ${trend})`
      : `正規化 ${pop} / 速度補正 ${trend}`
    : "人気シグナル無し";
  return (
    <div
      style={{
        padding: 12,
        marginBottom: 12,
        borderRadius: 10,
        background: "var(--bg-elev)",
        border: "0.5px solid var(--border)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: "0.12em",
          color: "var(--fg-faint)",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        なぜ採択された?
      </div>
      <BreakdownRow
        symbol="♡"
        color="oklch(0.62 0.18 15)"
        label="トレンド"
        value={pop}
        sub={popSub}
      />
      <BreakdownRow
        symbol="★"
        color="oklch(0.68 0.16 80)"
        label="興味マッチ"
        value={kw}
        sub={matched.length > 0 ? matched.map((k) => `#${k}`).join(" ") : "マッチ無し"}
      />
      <BreakdownRow
        symbol="ja/en"
        color="oklch(0.6 0.1 200)"
        label="言語ボーナス"
        value={lang}
        sub={lang === 15 ? "日本語ソース" : lang === 5 ? "英語の重要ソース" : "通常"}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 8,
          paddingTop: 8,
          borderTop: "0.5px dashed var(--border)",
        }}
      >
        <span style={{ color: "var(--fg-muted)" }}>合計スコア</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)" }}>
          {item.score}
          {item.score !== total && (
            <span style={{ color: "var(--fg-faint)", fontWeight: 400, marginLeft: 4 }}>
              (内訳合計 {total})
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function BreakdownRow({
  symbol,
  color,
  label,
  value,
  sub,
}: {
  symbol: string;
  color: string;
  label: string;
  value: number;
  sub?: string;
}) {
  const dim = value === 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        gap: 8,
        alignItems: "baseline",
        padding: "3px 0",
        opacity: dim ? 0.5 : 1,
      }}
    >
      <span style={{ color, fontWeight: 700, fontSize: 11 }}>{symbol}</span>
      <span style={{ color: "var(--fg-muted)" }}>
        {label}
        {sub && (
          <span style={{ color: "var(--fg-faint)", marginLeft: 6, fontSize: 10 }}>{sub}</span>
        )}
      </span>
      <span style={{ fontWeight: 700, color: dim ? "var(--fg-faint)" : color }}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

/**
 * 論文カードの abs / PDF ボタン。親の <button onClick={onToggle}> の中で click されても
 * トグルしないよう stopPropagation する。
 */
function PaperLinkButton({
  href,
  variant,
  label,
}: {
  href: string;
  variant: "abs" | "pdf";
  label: string;
}) {
  const isPdf = variant === "pdf";
  const base = isPdf ? "oklch(0.55 0.18 25)" : "oklch(0.58 0.13 50)";
  const fg = isPdf ? "oklch(0.5 0.18 25)" : "oklch(0.5 0.13 50)";
  return (
    <ExternalLink
      href={href}
      onClick={(e) => e.stopPropagation()}
      style={{
        padding: "2px 8px",
        borderRadius: 4,
        border: `0.5px solid color-mix(in oklch, ${base} 35%, transparent)`,
        color: `color-mix(in oklch, ${fg} 80%, var(--fg))`,
        background: `color-mix(in oklch, ${base} 10%, transparent)`,
        textDecoration: "none",
        fontSize: 10.5,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </ExternalLink>
  );
}
