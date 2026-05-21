"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import {
  BIG_COLOR,
  BIG_TAGS,
  DELTA_DOWN,
  DELTA_UP,
  FAM_COLOR,
  bigTagCountsByDate,
  dateRange,
  fmtDateBadge,
  itemBigTags,
  sourceLabel,
  type RecapPeriod,
  type RisingTag,
  type SourceTopEntry,
  type TagFreqEntry,
  type TrendTagEntry,
  risingTags,
  tagFrequency,
  topItemsBySource,
  trendScore,
  trendTags,
} from "./lib";
import { BigTagPill, PopularityBadge } from "./atoms";
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

type RankMode = "personal" | "world";

function ModeToggle({
  value,
  onChange,
}: {
  value: RankMode;
  onChange: (v: RankMode) => void;
}) {
  const opts: Array<{ id: RankMode; label: string }> = [
    { id: "personal", label: "あなた向け" },
    { id: "world", label: "トレンド" },
  ];
  return (
    <div
      style={{
        margin: "0 18px 8px",
        display: "inline-grid",
        gridTemplateColumns: `repeat(${opts.length}, auto)`,
        gap: 2,
        padding: 2,
        background: "var(--bg-sunken)",
        borderRadius: 8,
      }}
    >
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              padding: "6px 12px",
              border: 0,
              borderRadius: 6,
              background: active ? "var(--fg)" : "transparent",
              color: active ? "var(--bg)" : "var(--fg-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Heatmap({
  dates,
  counts,
  bundles,
}: {
  dates: string[];
  counts: Record<BigTagGroup, number[]>;
  bundles: Record<string, DailyBundle>;
}) {
  const cellMin = dates.length > 14 ? 14 : 22;
  const labelEvery = dates.length > 20 ? 5 : dates.length > 10 ? 3 : 1;
  const emptyCount = dates.filter((d) => !bundles[d]).length;
  const sparse = emptyCount >= dates.length / 2;
  return (
    <div style={{ padding: "0 16px", marginBottom: 4 }}>
      <div style={{ overflowX: "auto", scrollbarWidth: "none" }}>
        <div style={{ minWidth: 16 + dates.length * cellMin + 12 }}>
          {BIG_TAGS.map((t) => {
            const series = counts[t.id];
            const max = Math.max(...series, 1);
            return (
              <div
                key={t.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: `18px repeat(${dates.length}, minmax(${cellMin}px, 1fr))`,
                  gap: 2,
                  marginBottom: 3,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: t.color,
                    fontWeight: 700,
                    textAlign: "left",
                  }}
                  title={t.label}
                >
                  {t.emoji}
                </span>
                {series.map((v, i) => {
                  const has = !!bundles[dates[i] ?? ""];
                  const alpha = v === 0 ? (has ? 6 : 3) : Math.round(8 + 80 * (v / max));
                  return (
                    <div
                      key={i}
                      title={`${dates[i]} · ${t.label} · ${v} 件`}
                      style={{
                        height: cellMin,
                        borderRadius: 3,
                        background: `color-mix(in oklch, ${t.color} ${alpha}%, var(--bg-sunken))`,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `18px repeat(${dates.length}, minmax(${cellMin}px, 1fr))`,
              gap: 2,
              marginTop: 6,
            }}
          >
            <span />
            {dates.map((d, i) => {
              const dt = new Date(`${d}T00:00:00Z`);
              const show = i % labelEvery === 0 || i === dates.length - 1;
              return (
                <div
                  key={d}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8.5,
                    color: "var(--fg-faint)",
                    textAlign: "center",
                    fontFeatureSettings: '"tnum"',
                    visibility: show ? "visible" : "hidden",
                  }}
                >
                  {dt.getUTCMonth() + 1}/{dt.getUTCDate()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {sparse && (
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-faint)",
          }}
        >
          ※ {emptyCount} 日分はデータ蓄積中
        </div>
      )}
    </div>
  );
}

function RisingChips({ rising }: { rising: RisingTag[] }) {
  if (!rising.length) {
    return (
      <div
        style={{
          padding: "12px 18px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-faint)",
        }}
      >
        まだ十分な傾向が見えていません
      </div>
    );
  }
  return (
    <div
      style={{
        padding: "0 16px",
        display: "flex",
        gap: 8,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {rising.map((r) => {
        const c = r.bigGroup ? BIG_COLOR[r.bigGroup] : "var(--fg-faint)";
        return (
          <div
            key={r.tag}
            style={{
              flex: "0 0 auto",
              padding: "8px 10px",
              borderRadius: 10,
              background: `color-mix(in oklch, ${c} 8%, var(--bg-sunken))`,
              border: `0.5px solid color-mix(in oklch, ${c} 28%, transparent)`,
              minWidth: 92,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: `color-mix(in oklch, ${c} 70%, var(--fg))`,
                  whiteSpace: "nowrap",
                }}
              >
                #{r.tag}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: c,
                  letterSpacing: "0.02em",
                }}
              >
                ×{r.ratio.toFixed(1)}↑
              </span>
              <Spark values={r.series} color={c} w={36} h={14} />
            </div>
            <div
              style={{
                marginTop: 3,
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--fg-faint)",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {r.prior} → {r.recent}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TagBars({ entries }: { entries: TagFreqEntry[] }) {
  if (!entries.length) {
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
  const max = Math.max(...entries.map((e) => e.count), 1);
  return (
    <div style={{ padding: "0 18px" }}>
      {entries.map((e) => {
        const c = e.bigGroup ? BIG_COLOR[e.bigGroup] : "oklch(0.55 0.02 60)";
        const w = (e.count / max) * 100;
        let deltaNode: ReactNode = null;
        if (e.isNew) {
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
        } else if (e.delta !== 0) {
          const up = e.delta > 0;
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
              {e.delta}
            </span>
          );
        }
        return (
          <div
            key={e.tag}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 110px) 1fr auto auto",
              gap: 8,
              alignItems: "center",
              padding: "6px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: c,
                  flexShrink: 0,
                }}
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
                title={e.tag}
              >
                #{e.tag}
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: `color-mix(in oklch, ${c} 10%, var(--bg-sunken))`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${w}%`,
                  background: c,
                  borderRadius: 999,
                }}
              />
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
              {e.count}
            </span>
            <span style={{ minWidth: 24, textAlign: "right" }}>{deltaNode}</span>
          </div>
        );
      })}
    </div>
  );
}

function TrendTagBars({ entries }: { entries: TrendTagEntry[] }) {
  if (!entries.length) {
    return (
      <div
        style={{
          padding: "12px 18px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-faint)",
        }}
      >
        トレンドデータがまだありません (2026-05-20 以降の bundle から計測開始)
      </div>
    );
  }
  const max = Math.max(...entries.map((e) => e.trendSum), 1);
  return (
    <div style={{ padding: "0 18px" }}>
      {entries.map((e) => {
        const c = e.bigGroup ? BIG_COLOR[e.bigGroup] : "oklch(0.62 0.18 15)";
        const w = (e.trendSum / max) * 100;
        return (
          <div
            key={e.tag}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 110px) 1fr auto auto",
              gap: 8,
              alignItems: "center",
              padding: "6px 0",
            }}
            title={`トレンド合計 ${e.trendSum} / ${e.count} 件 / 平均 ${e.avg.toFixed(1)}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: c,
                  flexShrink: 0,
                }}
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
              >
                #{e.tag}
              </span>
            </div>
            <div
              style={{
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
                minWidth: 28,
                textAlign: "right",
              }}
            >
              ♡{e.trendSum}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--fg-faint)",
                fontFeatureSettings: '"tnum"',
                minWidth: 28,
                textAlign: "right",
              }}
            >
              {e.count}件
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SourceTopList({ entries }: { entries: SourceTopEntry[] }) {
  if (!entries.length) {
    return (
      <div
        style={{
          padding: "12px 18px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-faint)",
        }}
      >
        ソース別データがまだありません
      </div>
    );
  }
  return (
    <div style={{ padding: "0 16px" }}>
      {entries.map((e) => {
        const c = FAM_COLOR[e.family] ?? FAM_COLOR.other ?? "var(--fg)";
        return (
          <div
            key={e.family}
            style={{
              marginBottom: 10,
              padding: 12,
              borderRadius: 12,
              background: `color-mix(in oklch, ${c} 5%, var(--bg-sunken))`,
              borderLeft: `3px solid ${c}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
              }}
            >
              <span style={{ color: c, fontWeight: 700 }}>{e.label}</span>
              <span style={{ color: "var(--fg-faint)", fontSize: 10 }}>
                Top {e.items.length}
              </span>
            </div>
            {e.items.map((it, i) => (
              <ExternalLink
                key={it.id}
                href={it.url}
                style={{
                  display: "grid",
                  gridTemplateColumns: "14px 1fr auto",
                  gap: 8,
                  alignItems: "center",
                  padding: "6px 0",
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
                  title={sourceLabel(it.source)}
                >
                  {it.title}
                </span>
                <PopularityBadge value={trendScore(it)} label={it.popularityLabel} sm />
              </ExternalLink>
            ))}
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
  const [mode, setMode] = useState<RankMode>("personal");
  const rankKey = (it: BaseItem) => (mode === "world" ? trendScore(it) : it.score);
  const rankSymbol = mode === "world" ? "♡" : "★";

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

  const rising = useMemo(
    () =>
      risingTags(allBundles, dates, {
        minRecent: period === 7 ? 1 : 2,
        topN: 6,
      }),
    [allBundles, dates, period],
  );

  const tagTop = useMemo(
    () => tagFrequency(allBundles, dates, prevDates, 8),
    [allBundles, dates, prevDates],
  );

  const tagTrend = useMemo(() => trendTags(allBundles, dates, 8), [allBundles, dates]);

  const sourceTop = useMemo(
    () =>
      topItemsBySource(allItems, 3, {
        qiita: "Qiita",
        zenn: "Zenn",
        hn: "Hacker News",
        rust: "Rust 公式",
        python: "Python PEP",
        arxiv: "arXiv",
        github: "GitHub",
        reddit: "Reddit",
        kbd: "Keyboard",
        other: "その他 RSS",
      }),
    [allItems],
  );

  const groupBreakdown = useMemo(() => {
    return BIG_TAGS.map((t) => {
      const items = allItems.filter((it) => itemBigTags(it).includes(t.id));
      const sortable = mode === "world" ? items.filter((it) => it.kind !== "paper") : items;
      const top = [...sortable].sort((a, b) => rankKey(b) - rankKey(a)).slice(0, 3);
      return { ...t, n: items.length, top, counts: bigCounts[t.id] };
    });
  }, [allItems, bigCounts, mode]);

  const bestOfPeriod = useMemo(() => {
    const pool = mode === "world" ? allItems.filter((it) => it.kind !== "paper") : allItems;
    return [...pool].sort((a, b) => rankKey(b) - rankKey(a)).slice(0, 5);
  }, [allItems, mode]);

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
          直近 {period} 日のトレンド ·{" "}
          {mode === "world"
            ? "フェイバリット数 ÷ 経過時間 (獲得速度)"
            : "あなたの興味キーワードを加味"}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center" }}>
          <PeriodToggle value={period} onChange={setPeriod} />
          <ModeToggle value={mode} onChange={setMode} />
        </div>

        <div
          style={{
            padding: "8px 16px 4px",
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
              <div
                style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 500, lineHeight: 1 }}
              >
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

        <SectionLabel>大タグ × 日 ヒートマップ</SectionLabel>
        <Heatmap dates={dates} counts={bigCounts} bundles={allBundles} />

        <SectionLabel>急上昇タグ</SectionLabel>
        <RisingChips rising={rising} />

        <SectionLabel>タグ頻度 Top {tagTop.length || 8} (件数ベース)</SectionLabel>
        <TagBars entries={tagTop} />

        <SectionLabel>トレンドタグ Top {tagTrend.length || 8} (♡ 合計)</SectionLabel>
        <TrendTagBars entries={tagTrend} />

        <SectionLabel>ソース別 トレンド Top 3</SectionLabel>
        <SourceTopList entries={sourceTop} />

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
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10.5,
                        color: g.color,
                        fontWeight: 600,
                      }}
                    >
                      {rankSymbol}{rankKey(it)}
                    </span>
                  </ExternalLink>
                ))}
              </div>
            ))}
        </div>

        <SectionLabel>
          {period === 7 ? "今週" : `直近 ${period} 日`}の
          {mode === "world" ? "トレンド Top 5" : "ベスト 5"}
        </SectionLabel>
        {bestOfPeriod.map((it, i) => {
          const big = itemBigTags(it)[0];
          const c = big ? BIG_COLOR[big] : "var(--fg)";
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
                {rankSymbol}{rankKey(it)}
              </div>
            </ExternalLink>
          );
        })}
      </div>
    </>
  );
}
