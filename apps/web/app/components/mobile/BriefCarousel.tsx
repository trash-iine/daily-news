"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BaseItem } from "@daily-news/shared";
import {
  BIG_COLOR,
  FAM_COLOR,
  displayAuthors,
  fmtRel,
  itemBigTags,
  pdfUrlOf,
  sourceLabel,
  sourceFamily,
} from "./lib";
import { BigTagPill } from "./atoms";
import { ExternalLink } from "./ExternalLink";

function stripForPreview(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`+/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 「5-MIN BRIEF」横スワイプカルーセル。
 *
 * - All タブの最上部に置く想定。
 * - 論文 top 2 + ニュース top 3 をスコア順で 5 枚混ぜたカードを並べる。
 * - 各カードに「↗ 元記事」「PDF (論文のみ)」「一覧で見る ↓」アクション。
 * - スクロール位置を index に変換して下部 progress dots に反映。
 */
export function BriefCarousel({
  items,
  nowMs,
  onJump,
}: {
  items: BaseItem[];
  nowMs: number;
  /** カードの「一覧で見る ↓」を押したときに呼ばれる。jumpTo(id, kind)。 */
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth;
      const i = Math.round(el.scrollLeft / Math.max(1, w * 0.88));
      setIdx(Math.min(items.length - 1, Math.max(0, i)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  if (!items.length) return null;
  const totalMin = Math.max(3, Math.round(items.length * 1.0));

  return (
    <section
      style={{
        paddingTop: 10,
        paddingBottom: 12,
        borderBottom: "0.5px solid var(--rule)",
      }}
    >
      <div
        style={{
          padding: "0 14px 8px",
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
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--fg-faint)",
            fontFeatureSettings: '"tnum"',
          }}
        >
          {String(idx + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </div>
      </div>

      <div
        ref={ref}
        style={{
          display: "flex",
          gap: 10,
          padding: "2px 14px 10px",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
        }}
      >
        {items.map((it, i) => (
          <BriefCard key={it.id} item={it} index={i} nowMs={nowMs} onJump={onJump} />
        ))}
        {/* trailing spacer for last-card snap */}
        <div style={{ flex: "0 0 4px" }} />
      </div>

      {/* progress dots */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
        {items.map((_, i) => (
          <span
            key={i}
            style={{
              width: i === idx ? 18 : 5,
              height: 3,
              borderRadius: 2,
              background: i === idx ? "var(--fg)" : "var(--border)",
              transition: "width 0.2s, background 0.2s",
            }}
          />
        ))}
      </div>
    </section>
  );
}

function BriefCard({
  item,
  index,
  nowMs,
  onJump,
}: {
  item: BaseItem;
  index: number;
  nowMs: number;
  onJump: (id: string, kind: BaseItem["kind"]) => void;
}) {
  const isPaper = item.kind === "paper";
  const big = itemBigTags(item)[0];
  const bigColor = big ? BIG_COLOR[big] : "var(--border)";
  const fam = sourceFamily(item.source);
  const summary = useMemo(() => stripForPreview(item.summary || ""), [item.summary]);
  const pdf = pdfUrlOf(item);
  const authors = displayAuthors(item);
  const kindColor = isPaper ? "oklch(0.5 0.13 50)" : "oklch(0.5 0.13 240)";

  return (
    <article
      style={{
        flex: "0 0 86%",
        scrollSnapAlign: "start",
        background: "var(--bg-elev)",
        border: "0.5px solid var(--border)",
        borderLeft: `2px solid ${big ? bigColor : "transparent"}`,
        borderRadius: 12,
        padding: "12px 14px 12px",
        display: "flex",
        flexDirection: "column",
        minHeight: 232,
        boxShadow: "0 1px 0 rgba(0,0,0,0.02), 0 6px 18px -14px rgba(0,0,0,0.18)",
        position: "relative",
      }}
    >
      {/* index ribbon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 5,
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

      <h3
        style={{
          margin: "0 0 4px",
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          letterSpacing: "-0.012em",
          fontSize: item.title.length > 56 ? 15.5 : 17,
          lineHeight: 1.22,
          color: "var(--fg)",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {item.title}
      </h3>

      {/* meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          flexWrap: "wrap",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--fg-faint)",
          marginBottom: 8,
        }}
      >
        <span style={{ color: FAM_COLOR[fam], fontWeight: 500 }}>
          {sourceLabel(item.source)}
        </span>
        {authors && (
          <span
            style={{
              color: "var(--fg-muted)",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "60%",
            }}
          >
            · {authors.join(", ")}
          </span>
        )}
        <span style={{ marginLeft: "auto" }}>{fmtRel(item.publishedAt, nowMs)}</span>
      </div>

      {/* summary */}
      {summary ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--fg-muted)",
            margin: "0 0 10px",
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textAlign: "justify",
          }}
        >
          {summary}
        </p>
      ) : (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-faint)",
            fontStyle: "italic",
            margin: "0 0 10px",
          }}
        >
          要約なし — 元記事を参照
        </p>
      )}

      {/* actions */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexWrap: "wrap",
          borderTop: "0.5px dashed var(--border)",
          paddingTop: 8,
        }}
      >
        <ExternalLink
          href={item.url}
          style={{
            padding: "5px 10px",
            borderRadius: 6,
            background: "var(--fg)",
            color: "var(--bg)",
            fontFamily: "var(--font-sans)",
            fontSize: 11.5,
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
              padding: "5px 10px",
              borderRadius: 6,
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
          style={{
            marginLeft: "auto",
            padding: "5px 10px",
            borderRadius: 6,
            background: "transparent",
            color: "var(--fg-muted)",
            border: 0,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          一覧で見る ↓
        </button>
      </div>
    </article>
  );
}
