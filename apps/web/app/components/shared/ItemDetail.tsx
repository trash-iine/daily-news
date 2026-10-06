"use client";
import type { BaseItem } from "@daily-news/shared";
import { ExternalLink } from "./ExternalLink";
import { PaperSummaryStruct } from "./PaperSummaryStruct";
import { SummaryMarkdown } from "./SummaryMarkdown";

/**
 * ArticleCard の展開部と DetailPane が共有する詳細ブロック。
 * 論文は構造化要約 (あれば) を、ニュースは Markdown の概要を出す。
 */
export function SummaryBox({ item, padding }: { item: BaseItem; padding: number }) {
  if (!item.summary) return null;
  const isPaper = item.kind === "paper";
  return (
    <div
      style={{
        padding,
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
  );
}

export function OpenOriginalButton({ href }: { href: string }) {
  return (
    <ExternalLink
      href={href}
      style={{
        display: "block",
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
  );
}
