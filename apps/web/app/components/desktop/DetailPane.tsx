"use client";
import type { BaseItem } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import { BIG_TAG_DEF, itemBigTags } from "../shared/lib/bigTags";
import { displayAuthors, fmtRel, hostFromUrl, pdfUrlOf } from "../shared/lib/format";
import { Tag, Thumb } from "../shared/badges";
import { ItemMetaRow } from "../shared/ItemMetaRow";
import { OpenOriginalButton, SummaryBox } from "../shared/ItemDetail";
import { PaperLinkButton } from "../shared/PaperLinkButton";
import { ScoreBreakdown, hasBreakdown } from "../shared/ScoreBreakdown";

/**
 * デスクトップ右ペイン。論文もニュースも同じ枠で読む。
 * ArticleCard の展開部と役割は同じだが、常時表示なのでタグを省略せず全部出す。
 */
export function DetailPane({
  item,
  nowMs,
}: {
  item: BaseItem | null;
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

  const big = itemBigTags(item)[0];
  const bigColor = big ? BIG_TAG_DEF[big].color : "var(--border)";
  const isPaper = item.kind === "paper";
  const pdf = pdfUrlOf(item);
  const authors = displayAuthors(item, 8);

  return (
    <div style={{ padding: "20px 24px 32px", minWidth: 0 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <ItemMetaRow item={item} big={big} detail />
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
            <PaperLinkButton href={item.url} variant="abs" />
            {pdf && <PaperLinkButton href={pdf} variant="pdf" />}
          </span>
        </div>
      )}

      <SummaryBox item={item} padding={16} />

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

      <OpenOriginalButton href={item.url} />
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
