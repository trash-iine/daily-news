"use client";
import type { BaseItem } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import { BIG_COLOR, itemBigTags } from "./lib/bigTags";
import { FAM_COLOR, sourceFamily, sourceLabel } from "./lib/sources";
import {
  displayAuthors,
  fmtRel,
  hostFromUrl,
  pdfUrlOf,
  stripForPreview,
} from "./lib/format";
import { trendScore } from "./lib/trend";
import { SCORE_COLOR } from "./lib/scoreColors";
import { BigTagPill, InterestBadge, PopularityBadge, Tag, Thumb } from "./atoms/badges";
import { ExternalLink } from "./ExternalLink";
import { SummaryMarkdown } from "./SummaryMarkdown";
import { PaperSummaryStruct } from "./PaperSummaryStruct";
import { ScoreBreakdown, hasBreakdown } from "./ScoreBreakdown";

/** 大タグが付いていない item の評価バー色。RecapScreen / Tag と同じ中性色。 */
const NEUTRAL = "oklch(0.55 0.02 60)";

export function ArticleCard({
  item,
  expanded,
  onToggle,
  saved,
  onSave,
  nowMs,
  highlighted,
  scoreScale,
}: {
  item: BaseItem;
  /** 論文のみ有効。ニュースは展開を持たないので無視される。 */
  expanded: boolean;
  onToggle: () => void;
  saved: boolean;
  onSave: () => void;
  nowMs: number;
  /** 続いている話題カードから jump してきた直後の一時ハイライト。 */
  highlighted?: boolean;
  /** ニュース評価バーの分母 (リスト内の最大 news score)。lib/bundle の newsScoreScale。 */
  scoreScale: number;
}) {
  const fam = sourceFamily(item.source);
  const big = itemBigTags(item)[0];
  const isTrending = item.tags.includes(TRENDING_TAG);
  const bigColor = big ? BIG_COLOR[big] : "var(--border)";
  const isPaper = item.kind === "paper";
  /** 展開は論文だけの機能。ニュースはカードタップで直接元記事へ飛ぶ。 */
  const isOpen = isPaper && expanded;
  const pdf = pdfUrlOf(item);
  const authors = displayAuthors(item);

  /** 論文はトグルボタン、ニュースは元記事へのリンクとして包む共通の本文。 */
  const body = (
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
            <PaperLinkButton href={item.url} variant="abs" label="abs" />
            {pdf && <PaperLinkButton href={pdf} variant="pdf" label="PDF" />}
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
        {/* ニュースは展開部を持たないので、保存ボタンをカードに常設する。 */}
        {!isPaper && <SaveIconButton saved={saved} onSave={onSave} />}
      </div>
      {!isPaper && <ScoreBar item={item} scale={scoreScale} color={big ? bigColor : NEUTRAL} />}
      {isOpen && (
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

/**
 * ニュースカード最下部の評価バー。バー全体の長さは score / リスト内最大値で、
 * その中をトレンド♡ / 興味マッチ★ / 言語ボーナス の 3 色で積み上げる。
 *
 * score と内訳合計は一致しないことがある (トレンド枠は score が時間減衰後の velocityScore
 * なのに対し popularity は減衰前の生値)。セグメントは「合計に対する比率」で描き、
 * バー全体の長さは常に score に合わせることで、バー長と右の数値が食い違わないようにする。
 * 内訳フィールドの無い旧データ (2026-05-21 以前) は大タグ色の単色バーにフォールバックする。
 */
function ScoreBar({ item, scale, color }: { item: BaseItem; scale: number; color: string }) {
  const total = Math.max(0, Math.min(100, (item.score / scale) * 100));
  const parts = [
    { key: "popularity", value: item.popularity ?? 0, color: SCORE_COLOR.popularity },
    { key: "keyword", value: item.keywordScore ?? 0, color: SCORE_COLOR.keyword },
    { key: "language", value: item.languageBonus ?? 0, color: SCORE_COLOR.language },
  ].filter((p) => p.value > 0);
  const sum = parts.reduce((a, p) => a + p.value, 0);
  const stacked = sum > 0;
  const hasParts =
    item.popularity !== undefined ||
    item.keywordScore !== undefined ||
    item.languageBonus !== undefined;
  // トレンド枠は score が時間減衰後なので内訳合計と食い違う。ScoreBreakdown と同じ書式で併記する。
  const tip = hasParts
    ? `トレンド ♡${item.popularity ?? 0} / 興味 ★${item.keywordScore ?? 0} / 言語 +${item.languageBonus ?? 0} → 合計 ${item.score}${
        sum !== item.score ? ` (内訳合計 ${sum})` : ""
      }`
    : `合計スコア ${item.score}`;
  return (
    <div
      title={tip}
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
      }}
    >
      <div
        role="meter"
        aria-label="評価スコア"
        aria-valuenow={item.score}
        aria-valuemin={0}
        aria-valuemax={scale}
        style={{
          flex: 1,
          height: 5,
          borderRadius: 999,
          // 積み上げ時に大タグ色が混ざると 4 色目に見えるので、トラックは中性色にする。
          background: stacked
            ? "var(--bg-sunken)"
            : `color-mix(in oklch, ${color} 10%, var(--bg-sunken))`,
          overflow: "hidden",
        }}
      >
        {/* 両端だけ丸め、セグメント同士は角無しで突き合わせる。 */}
        <div
          style={{
            display: "flex",
            height: "100%",
            width: `${total}%`,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          {stacked ? (
            parts.map((p) => (
              <div key={p.key} style={{ width: `${(p.value / sum) * 100}%`, background: p.color }} />
            ))
          ) : (
            <div style={{ width: "100%", background: color }} />
          )}
        </div>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--fg-muted)",
          fontFeatureSettings: '"tnum"',
          minWidth: 20,
          textAlign: "right",
        }}
      >
        {item.score}
      </span>
    </div>
  );
}

/**
 * ニュースカードの常設保存ボタン。本文リンクの外 (サムネイル下) に置いてあるので
 * クリックが元記事リンクに吸われることはない。
 */
function SaveIconButton({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  const c = "oklch(0.7 0.16 80)";
  return (
    <button
      onClick={onSave}
      aria-pressed={saved}
      aria-label={saved ? "保存済み" : "保存"}
      title={saved ? "保存済み" : "保存"}
      style={{
        width: 64,
        height: 24,
        padding: 0,
        borderRadius: 6,
        background: saved ? c : "var(--bg-elev)",
        border: `0.5px solid ${saved ? c : "var(--border)"}`,
        color: saved ? "white" : "var(--fg-faint)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        cursor: "pointer",
      }}
    >
      ★
    </button>
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
