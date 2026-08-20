"use client";
import type { BaseItem } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import { BIG_COLOR, itemBigTags } from "../shared/lib/bigTags";
import { FAM_COLOR, sourceFamily, sourceLabel } from "../shared/lib/sources";
import { displayAuthors, fmtRel, hostFromUrl, pdfUrlOf } from "../shared/lib/format";
import { BigTagPill, Tag, Thumb } from "../shared/badges";
import { ExternalLink } from "../shared/ExternalLink";
import { PaperLinkButton } from "../shared/PaperLinkButton";
import { PaperSummaryStruct } from "../shared/PaperSummaryStruct";
import { SummaryMarkdown } from "../shared/SummaryMarkdown";
import { ScoreBreakdown, hasBreakdown } from "../shared/ScoreBreakdown";

/**
 * デスクトップ右ペイン。論文もニュースも同じ枠で読む。
 * ArticleCard の展開部と役割は同じだが、常時表示なのでタグを省略せず全部出す。
 */
export function DetailPane({
  item,
  saved,
  onSave,
  nowMs,
}: {
  item: BaseItem | null;
  saved: boolean;
  onSave: () => void;
  nowMs: number;
}) {
  if (!item) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          color: "var(--fg-faint)",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 30, fontFamily: "var(--font-mono)" }}>◧</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          左のリストから記事を選ぶと
          <br />
          ここに要約と採択理由が出ます。
        </div>
      </div>
    );
  }

  const fam = sourceFamily(item.source);
  const big = itemBigTags(item)[0];
  const bigColor = big ? BIG_COLOR[big] : "var(--border)";
  const isPaper = item.kind === "paper";
  const isTrending = item.tags.includes(TRENDING_TAG);
  const pdf = pdfUrlOf(item);
  const authors = displayAuthors(item, 8);

  return (
    <div style={{ padding: "20px 24px 32px", minWidth: 0 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--fg-faint)",
            }}
          >
            {big && <BigTagPill id={big} />}
            <span
              style={{
                padding: "2px 7px",
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
                  padding: "2px 7px",
                  borderRadius: 3,
                  fontWeight: 700,
                  background: "color-mix(in oklch, oklch(0.65 0.17 35) 16%, transparent)",
                  color: "oklch(0.52 0.17 35)",
                }}
              >
                話題
              </span>
            )}
            <span style={{ color: FAM_COLOR[fam], fontWeight: 500 }}>
              {sourceLabel(item.source)}
            </span>
          </div>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 1.35,
              letterSpacing: "-0.015em",
              margin: 0,
            }}
          >
            {item.title}
          </h2>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--fg-faint)",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span>{hostFromUrl(item.url)}</span>
            <span>·</span>
            <span>{fmtRel(item.publishedAt, nowMs)}</span>
          </div>
        </div>
        <Thumb item={item} size={96} />
      </div>

      {isPaper && (authors || pdf) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 14,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {authors && (
            <span style={{ color: "var(--fg-muted)", lineHeight: 1.5, minWidth: 0 }}>
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
            padding: 16,
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

      {item.tags.filter((t) => t !== TRENDING_TAG).length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
          {item.tags
            .filter((t) => t !== TRENDING_TAG)
            .map((t) => (
              <Tag key={t} t={t} />
            ))}
        </div>
      )}

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
      <div
        aria-hidden
        style={{
          marginTop: 14,
          height: 2,
          borderRadius: 999,
          background: `color-mix(in oklch, ${bigColor} 40%, transparent)`,
        }}
      />
    </div>
  );
}
