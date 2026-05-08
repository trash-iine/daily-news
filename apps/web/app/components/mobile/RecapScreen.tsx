"use client";
import { useMemo } from "react";
import type { DailyBundle } from "@daily-news/shared";
import { BIG_COLOR, BIG_TAGS, fmtDateBadge, itemBigTags } from "./lib";
import { BigTagPill } from "./atoms";

function Spark({ values, color, w = 64, h = 22 }: { values: number[]; color: string; w?: number; h?: number }) {
  if (!values.length) return null;
  const last = values[values.length - 1] ?? 0;
  const max = Math.max(...values, 1);
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle
        cx={(values.length - 1) * step}
        cy={h - (last / max) * (h - 4) - 2}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

export function RecapScreen({
  allBundles,
  archive,
}: {
  allBundles: Record<string, DailyBundle>;
  archive: string[];
}) {
  const last7 = useMemo(() => archive.slice(0, 7), [archive]);

  const allItems = useMemo(
    () => last7.flatMap((d) => allBundles[d]?.items ?? []),
    [allBundles, last7],
  );

  const totals = {
    items: allItems.length,
    papers: allItems.filter((i) => i.kind === "paper").length,
    news: allItems.filter((i) => i.kind === "news").length,
  };

  const groupBreakdown = useMemo(() => {
    return BIG_TAGS.map((t) => {
      const items = allItems.filter((it) => itemBigTags(it).includes(t.id));
      const top = [...items].sort((a, b) => b.score - a.score).slice(0, 3);
      const counts = last7
        .slice()
        .reverse()
        .map((d) => (allBundles[d]?.items ?? []).filter((it) => itemBigTags(it).includes(t.id)).length);
      return { ...t, n: items.length, top, counts };
    });
  }, [allItems, allBundles, last7]);

  const bestOfWeek = useMemo(
    () => [...allItems].sort((a, b) => b.score - a.score).slice(0, 5),
    [allItems],
  );

  const firstD = last7[0];
  const lastD = last7[last7.length - 1];
  if (!firstD || !lastD) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--fg-faint)" }}>データがありません</div>
    );
  }

  const startD = new Date(lastD);
  const endD = new Date(firstD);

  return (
    <>
      <div style={{ padding: "8px 18px 6px" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--fg-faint)",
            textTransform: "uppercase",
          }}
        >
          WEEK · {last7.length}日
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            margin: "2px 0 4px",
            lineHeight: 1.1,
          }}
        >
          {startD.getMonth() + 1}/{startD.getDate()} — {endD.getMonth() + 1}/{endD.getDate()}
        </h1>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>今週のまとめ</div>
      </div>

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 12 }}>
        <div
          style={{
            padding: "12px 16px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {[
            { n: totals.items, l: "ITEMS" },
            { n: totals.papers, l: "PAPERS" },
            { n: totals.news, l: "NEWS" },
          ].map((s) => (
            <div key={s.l} style={{ padding: 12, background: "var(--bg-sunken)", borderRadius: 10 }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 500, lineHeight: 1 }}>
                {s.n}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  color: "var(--fg-faint)",
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "16px 18px 6px" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--fg-faint)",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            大タグ別
          </div>
        </div>
        <div style={{ padding: "0 16px" }}>
          {groupBreakdown
            .filter((g) => g.n > 0)
            .map((g) => (
              <div
                key={g.id}
                style={{
                  marginBottom: 10,
                  padding: 14,
                  borderRadius: 12,
                  background: `color-mix(in oklch, ${g.color} 6%, var(--bg-sunken))`,
                  borderLeft: `3px solid ${g.color}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 14,
                        color: g.color,
                        fontWeight: 700,
                      }}
                    >
                      {g.emoji}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{g.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>
                      {g.n} 件
                    </span>
                  </div>
                  <Spark values={g.counts} color={g.color} />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.5, marginBottom: 8 }}>
                  {g.desc}
                </div>
                {g.top.map((it, i) => (
                  <a
                    key={it.id}
                    href={it.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 8,
                      alignItems: "center",
                      padding: "8px 0",
                      borderTop: "0.5px solid color-mix(in oklch, var(--border) 60%, transparent)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--fg-faint)",
                        width: 14,
                        textAlign: "right",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {it.title}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10.5,
                        color: g.color,
                        fontWeight: 600,
                      }}
                    >
                      ★{it.score}
                    </span>
                  </a>
                ))}
              </div>
            ))}
        </div>

        <div style={{ padding: "20px 18px 6px" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--fg-faint)",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            今週のベスト 5
          </div>
        </div>
        {bestOfWeek.map((it, i) => {
          const big = itemBigTags(it)[0];
          const c = big ? BIG_COLOR[big] : "var(--fg)";
          return (
            <a
              key={it.id}
              href={it.url}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                display: "grid",
                gridTemplateColumns: "30px 1fr auto",
                gap: 12,
                padding: "14px 18px",
                borderTop: "0.5px solid var(--rule)",
                alignItems: "center",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--fg-faint)",
                  lineHeight: 1,
                }}
              >
                {i + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 3 }}>
                  {big && <BigTagPill id={big} sm />}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-faint)" }}>
                    {fmtDateBadge(it.publishedAt)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {it.title}
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: c, fontWeight: 500 }}>
                ★{it.score}
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
