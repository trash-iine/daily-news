"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { BigTagGroup, DailyBundle } from "@daily-news/shared";
import { BIG_COLOR, BIG_TAGS, itemBigTags } from "./lib/bigTags";
import { sourceLabel } from "./lib/sources";
import { fmtDateBadge } from "./lib/format";
import {
  DELTA_DOWN,
  DELTA_UP,
  bigTagCountsByDate,
  dateRange,
  type RecapPeriod,
  risingTags,
  tagCountsByDate,
  tagFrequency,
  trendScore,
  worldTrendTags,
} from "./lib/trend";
import { BigTagPill, PopularityBadge } from "./atoms/badges";
import { ExternalLink } from "./ExternalLink";

function Spark({
  values,
  color,
  w = 64,
  h = 22,
}: {
  values: number[];
  color: string;
  w?: number;
  h?: number;
}) {
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

function PeriodToggle({
  value,
  onChange,
}: {
  value: RecapPeriod;
  onChange: (v: RecapPeriod) => void;
}) {
  const opts: RecapPeriod[] = [7, 14, 30];
  return (
    <div
      style={{
        margin: "0 18px 8px",
        display: "inline-grid",
        gridTemplateColumns: `repeat(${opts.length}, 1fr)`,
        gap: 2,
        padding: 2,
        background: "var(--bg-sunken)",
        borderRadius: 8,
      }}
    >
      {opts.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              padding: "6px 14px",
              border: 0,
              borderRadius: 6,
              background: active ? "var(--fg)" : "transparent",
              color: active ? "var(--bg)" : "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            {o}d
          </button>
        );
      })}
    </div>
  );
}

interface TagRow {
  tag: string;
  bigGroup: BigTagGroup | null;
  count: number;
  delta: number;
  isNew: boolean;
  series: number[];
  ratio: number;
  worldSum: number;
}

function TagsTable({ rows }: { rows: TagRow[] }) {
  if (!rows.length) {
    return (
      <div
        style={{
          padding: "12px 18px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-faint)",
        }}
      >
        タグデータがありません
      </div>
    );
  }
  const maxCount = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div style={{ padding: "0 18px" }}>
      {rows.map((r) => {
        const c = r.bigGroup ? BIG_COLOR[r.bigGroup] : "oklch(0.55 0.02 60)";
        const w = (r.count / maxCount) * 100;
        let deltaNode: ReactNode = null;
        if (r.isNew) {
          deltaNode = (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                fontWeight: 700,
                color: DELTA_UP,
                padding: "1px 5px",
                borderRadius: 3,
                border: `0.5px solid color-mix(in oklch, ${DELTA_UP} 35%, transparent)`,
              }}
            >
              新
            </span>
          );
        } else if (r.ratio >= 1.5) {
          deltaNode = (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                color: DELTA_UP,
                fontFeatureSettings: '"tnum"',
              }}
            >
              ×{r.ratio.toFixed(1)}↑
            </span>
          );
        } else if (r.delta !== 0) {
          const up = r.delta > 0;
          deltaNode = (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                color: up ? DELTA_UP : DELTA_DOWN,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {up ? "+" : ""}
              {r.delta}
            </span>
          );
        }
        return (
          <div
            key={r.tag}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 100px) 1fr 48px 36px 40px",
              gap: 8,
              alignItems: "center",
              padding: "6px 0",
            }}
            title={
              r.worldSum > 0
                ? `${r.count} 件 · 世間トレンド ${r.worldSum}`
                : `${r.count} 件`
            }
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span
                style={{ width: 6, height: 6, borderRadius: 999, background: c, flexShrink: 0 }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--fg)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={r.tag}
              >
                #{r.tag}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 999,
                  background: `color-mix(in oklch, ${c} 10%, var(--bg-sunken))`,
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "100%", width: `${w}%`, background: c, borderRadius: 999 }} />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--fg)",
                  fontFeatureSettings: '"tnum"',
                  minWidth: 18,
                  textAlign: "right",
                }}
              >
                {r.count}
              </span>
            </div>
            <span style={{ display: "flex", justifyContent: "center" }}>
              {r.series.length > 0 ? <Spark values={r.series} color={c} w={44} h={14} /> : null}
            </span>
            <span style={{ textAlign: "right" }}>{deltaNode}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: r.worldSum > 0 ? "oklch(0.62 0.18 15)" : "transparent",
                fontWeight: 600,
                fontFeatureSettings: '"tnum"',
                textAlign: "right",
              }}
            >
              {r.worldSum > 0 ? `♡${r.worldSum}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "20px 18px 8px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.12em",
        color: "var(--fg-faint)",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

export function RecapScreen({
  allBundles,
  archive,
}: {
  allBundles: Record<string, DailyBundle>;
  archive: string[];
}) {
  const [period, setPeriod] = useState<RecapPeriod>(7);

  const dates = useMemo(() => {
    const latest = archive[0];
    if (!latest) return [];
    return dateRange(latest, period);
  }, [archive, period]);

  const prevDates = useMemo(() => {
    const latest = archive[0];
    if (!latest) return [];
    const all = dateRange(latest, period * 2);
    return all.slice(0, period);
  }, [archive, period]);

  const allItems = useMemo(
    () => dates.flatMap((d) => allBundles[d]?.items ?? []),
    [allBundles, dates],
  );

  const totals = {
    items: allItems.length,
    papers: allItems.filter((i) => i.kind === "paper").length,
    news: allItems.filter((i) => i.kind === "news").length,
  };

  const bigCounts = useMemo(
    () => bigTagCountsByDate(allBundles, dates),
    [allBundles, dates],
  );

  const tagRows = useMemo<TagRow[]>(() => {
    const freq = tagFrequency(allBundles, dates, prevDates, 200);
    const series = tagCountsByDate(allBundles, dates);
    const rising = risingTags(allBundles, dates, {
      minRecent: period === 7 ? 1 : 2,
      topN: 200,
    });
    const ratioByTag = new Map(rising.map((r) => [r.tag, r.ratio]));
    const world = worldTrendTags(allBundles, dates, 200);
    const worldByTag = new Map(world.map((w) => [w.tag, w.trendSum]));
    const rows: TagRow[] = freq.map((f) => ({
      tag: f.tag,
      bigGroup: f.bigGroup,
      count: f.count,
      delta: f.delta,
      isNew: f.isNew,
      series: series[f.tag] ?? [],
      ratio: ratioByTag.get(f.tag) ?? 0,
      worldSum: worldByTag.get(f.tag) ?? 0,
    }));
    rows.sort((a, b) => {
      const aPin = a.ratio >= 2.0 ? 1 : 0;
      const bPin = b.ratio >= 2.0 ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      return b.count - a.count || a.tag.localeCompare(b.tag);
    });
    return rows.slice(0, 10);
  }, [allBundles, dates, prevDates, period]);

  const groupBreakdown = useMemo(() => {
    return BIG_TAGS.map((t) => {
      const items = allItems.filter((it) => itemBigTags(it).includes(t.id));
      const sortable = items.filter((it) => it.kind !== "paper");
      const top = [...sortable].sort((a, b) => trendScore(b) - trendScore(a)).slice(0, 3);
      return { ...t, n: items.length, top, counts: bigCounts[t.id] };
    });
  }, [allItems, bigCounts]);

  const bestOfPeriod = useMemo(() => {
    const pool = allItems.filter((it) => it.kind !== "paper");
    return [...pool].sort((a, b) => trendScore(b) - trendScore(a)).slice(0, 5);
  }, [allItems]);

  const firstD = dates[0];
  const lastD = dates[dates.length - 1];

  if (!firstD || !lastD) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--fg-faint)" }}>
        データがありません
      </div>
    );
  }

  const startD = new Date(`${firstD}T00:00:00Z`);
  const endD = new Date(`${lastD}T00:00:00Z`);

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
          RECAP · {period}日
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
          {startD.getUTCMonth() + 1}/{startD.getUTCDate()} — {endD.getUTCMonth() + 1}/
          {endD.getUTCDate()}
        </h1>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>
          直近 {period} 日 · {totals.items} 件 (論文 {totals.papers} · ニュース {totals.news}) ·
          フェイバリット数 ÷ 経過時間 (獲得速度)
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>

        <SectionLabel>タグ動向 Top {tagRows.length || 10} · 件数 / 推移 / Δ / 世間 ♡</SectionLabel>
        <TagsTable rows={tagRows} />

        <SectionLabel>大タグ別</SectionLabel>
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
                    <span
                      style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}
                    >
                      {g.n} 件
                    </span>
                  </div>
                  <Spark values={g.counts} color={g.color} />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.5, marginBottom: 8 }}>
                  {g.desc}
                </div>
                {g.top.map((it, i) => (
                  <ExternalLink
                    key={it.id}
                    href={it.url}
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
                    <PopularityBadge
                      value={trendScore(it)}
                      label={it.popularityLabel}
                      sm
                    />
                  </ExternalLink>
                ))}
              </div>
            ))}
        </div>

        <SectionLabel>
          {period === 7 ? "今週" : `直近 ${period} 日`}のトレンド Top 5
        </SectionLabel>
        {bestOfPeriod.map((it, i) => {
          const big = itemBigTags(it)[0];
          return (
            <ExternalLink
              key={it.id}
              href={it.url}
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
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-faint)" }}>
                    · {sourceLabel(it.source)}
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
              <PopularityBadge value={trendScore(it)} label={it.popularityLabel} />
            </ExternalLink>
          );
        })}
      </div>
    </>
  );
}
