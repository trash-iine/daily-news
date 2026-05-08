"use client";
import type { BaseItem } from "@daily-news/shared";
import { BIG_COLOR, FAM_COLOR, fmtRel, hostFromUrl, itemBigTags, sourceFamily, sourceLabel } from "./lib";
import { BigTagPill, Tag } from "./atoms";

export function ArticleCard({
  item,
  expanded,
  onToggle,
  saved,
  onSave,
  nowMs,
}: {
  item: BaseItem;
  expanded: boolean;
  onToggle: () => void;
  saved: boolean;
  onSave: () => void;
  nowMs: number;
}) {
  const fam = sourceFamily(item.source);
  const big = itemBigTags(item)[0];
  const bigColor = big ? BIG_COLOR[big] : "var(--border)";
  const isPaper = item.kind === "paper";
  return (
    <article
      style={{
        padding: "14px 18px",
        borderTop: "0.5px solid var(--rule)",
        background: expanded ? "var(--bg-sunken)" : "transparent",
        borderLeft: `2px solid ${big ? bigColor : "transparent"}`,
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
          cursor: "pointer",
          color: "inherit",
          fontFamily: "inherit",
        }}
      >
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
          <span style={{ marginLeft: "auto" }}>★{item.score}</span>
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
            {item.summary}
          </p>
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
      </button>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
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
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                {item.summary}
              </p>
            </div>
          )}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-faint)", marginBottom: 12 }}>
            {hostFromUrl(item.url)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
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
            </a>
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
