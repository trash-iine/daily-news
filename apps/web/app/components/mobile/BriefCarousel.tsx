"use client";
import { useMemo } from "react";
import type { BaseItem } from "@daily-news/shared";
import { BIG_COLOR, itemBigTags } from "./lib/bigTags";
import { FAM_COLOR, sourceFamily, sourceLabel } from "./lib/sources";
import { displayAuthors, fmtRel, pdfUrlOf, stripForPreview } from "./lib/format";
import { BigTagPill } from "./atoms/badges";
import { ExternalLink } from "./ExternalLink";

/**
 * 「5-MIN BRIEF」コンパクト縦リスト。
 *
 * - All タブの最上部に置く想定。
 * - 論文 top 2 + ニュース top 3 をスコア順で 5 件混ぜたものを縦に並べる。
 * - 各行に「↗ 元記事」「PDF (論文のみ)」「↓ (一覧へジャンプ)」アクション。
 * - 横スクロールを持たないため、親スクローラの日付スワイプと競合しない。
 */
export function BriefCarousel({
  items,
  nowMs,
  onJump,
}: {
  items: BaseItem[];
  nowMs: number;
  /** 行末の「↓」を押したときに呼ばれる。jumpTo(id, kind)。 */
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}) {
  if (!items.length) return null;
  const totalMin = Math.max(3, items.length);

  return (
    <section
      style={{
        paddingTop: 10,
        paddingBottom: 8,
        borderBottom: "0.5px solid var(--rule)",
      }}
    >
      <div
        style={{
          padding: "0 14px 6px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: "0.16em",
              color: "var(--fg-faint)",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 1,
            }}
          >
            5-MIN BRIEF · 今日の必読
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "var(--fg)",
            }}
          >
            {items.length} 本{" "}
            <span style={{ color: "var(--fg-faint)", fontStyle: "italic", fontSize: 13 }}>
              · 約 {totalMin} 分
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 14px" }}>
        {items.map((it, i) => (
          <BriefRow
            key={it.id}
            item={it}
            index={i}
            isLast={i === items.length - 1}
            nowMs={nowMs}
            onJump={onJump}
          />
        ))}
      </div>
    </section>
  );
}

function BriefRow({
  item,
  index,
  isLast,
  nowMs,
  onJump,
}: {
  item: BaseItem;
  index: number;
  isLast: boolean;
  nowMs: number;
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}) {
  const isPaper = item.kind === "paper";
  const big = itemBigTags(item)[0];
  const bigColor = big ? BIG_COLOR[big] : "transparent";
  const fam = sourceFamily(item.source);
  const summary = useMemo(() => stripForPreview(item.summary || ""), [item.summary]);
  const pdf = pdfUrlOf(item);
  const authors = displayAuthors(item);
  const kindColor = isPaper ? "oklch(0.5 0.13 50)" : "oklch(0.5 0.13 240)";

  return (
    <article
      style={{
        padding: "10px 0 10px 10px",
        borderLeft: `2px solid ${bigColor}`,
        borderBottom: isLast ? undefined : "0.5px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {/* ribbon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-faint)",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 10,
            color: "var(--fg-muted)",
            fontFeatureSettings: '"tnum"',
            letterSpacing: "0.04em",
          }}
        >
          №{String(index + 1).padStart(2, "0")}
        </span>
        <span
          style={{
            padding: "1px 6px",
            borderRadius: 3,
            fontWeight: 700,
            background: isPaper
              ? "color-mix(in oklch, oklch(0.58 0.13 50) 14%, transparent)"
              : "color-mix(in oklch, oklch(0.55 0.13 240) 14%, transparent)",
            color: kindColor,
          }}
        >
          {isPaper ? "論文" : "NEWS"}
        </span>
        {big && <BigTagPill id={big} sm />}
        <span
          style={{
            marginLeft: "auto",
            color: "var(--fg-faint)",
            fontFeatureSettings: '"tnum"',
          }}
        >
          ★{item.score}
        </span>
      </div>

      {/* title (1 line clamp) */}
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          letterSpacing: "-0.012em",
          fontSize: 14,
          lineHeight: 1.25,
          color: "var(--fg)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.title}
      </h3>

      {/* summary (2 line clamp) */}
      {summary && (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 12,
            lineHeight: 1.45,
            color: "var(--fg-muted)",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {summary}
        </p>
      )}

      {/* meta + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginTop: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            minWidth: 0,
            flex: "1 1 auto",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-faint)",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          <span style={{ color: FAM_COLOR[fam], fontWeight: 500 }}>
            {sourceLabel(item.source)}
          </span>
          {authors && (
            <span
              style={{
                color: "var(--fg-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              · {authors.join(", ")}
            </span>
          )}
          <span style={{ marginLeft: "auto", flexShrink: 0 }}>
            · {fmtRel(item.publishedAt, nowMs)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          <ExternalLink
            href={item.url}
            style={{
              padding: "3px 8px",
              borderRadius: 5,
              background: "var(--fg)",
              color: "var(--bg)",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            ↗ 元記事
          </ExternalLink>
          {isPaper && pdf && (
            <ExternalLink
              href={pdf}
              style={{
                padding: "3px 8px",
                borderRadius: 5,
                background: "transparent",
                color: "var(--fg)",
                border: "0.5px solid var(--border)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
                textDecoration: "none",
              }}
            >
              PDF
            </ExternalLink>
          )}
          <button
            type="button"
            onClick={() => onJump(item.id, item.kind)}
            aria-label="一覧で見る"
            style={{
              padding: "3px 8px",
              borderRadius: 5,
              background: "transparent",
              color: "var(--fg-muted)",
              border: "0.5px solid var(--border)",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            ↓
          </button>
        </div>
      </div>
    </article>
  );
}
