"use client";
import type { BaseItem } from "@daily-news/shared";
import { trendScore } from "./lib/trend";

export function hasBreakdown(item: BaseItem): boolean {
  return (
    item.popularity !== undefined ||
    item.keywordScore !== undefined ||
    item.languageBonus !== undefined
  );
}

/**
 * 採択理由 (なぜこの記事が選ばれたか) を内訳で示すブロック。
 * トレンド / 興味マッチ / 言語ボーナスの寄与を読み取れるようにする。
 */
export function ScoreBreakdown({ item }: { item: BaseItem }) {
  const pop = item.popularity ?? 0;
  const kw = item.keywordScore ?? 0;
  const lang = item.languageBonus ?? 0;
  const total = pop + kw + lang;
  const trend = trendScore(item);
  const matched = item.matchedKeywords ?? [];
  const popSub = pop > 0
    ? item.popularityLabel
      ? `${item.popularityLabel} (正規化 ${pop} / 速度補正 ${trend})`
      : `正規化 ${pop} / 速度補正 ${trend}`
    : "人気シグナル無し";
  return (
    <div
      style={{
        padding: 12,
        marginBottom: 12,
        borderRadius: 10,
        background: "var(--bg-elev)",
        border: "0.5px solid var(--border)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: "0.12em",
          color: "var(--fg-faint)",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        なぜ採択された?
      </div>
      <BreakdownRow
        symbol="♡"
        color="oklch(0.62 0.18 15)"
        label="トレンド"
        value={pop}
        sub={popSub}
      />
      <BreakdownRow
        symbol="★"
        color="oklch(0.68 0.16 80)"
        label="興味マッチ"
        value={kw}
        sub={matched.length > 0 ? matched.map((k) => `#${k}`).join(" ") : "マッチ無し"}
      />
      <BreakdownRow
        symbol="ja/en"
        color="oklch(0.6 0.1 200)"
        label="言語ボーナス"
        value={lang}
        sub={lang === 15 ? "日本語ソース" : lang === 5 ? "英語の重要ソース" : "通常"}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 8,
          paddingTop: 8,
          borderTop: "0.5px dashed var(--border)",
        }}
      >
        <span style={{ color: "var(--fg-muted)" }}>合計スコア</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)" }}>
          {item.score}
          {item.score !== total && (
            <span style={{ color: "var(--fg-faint)", fontWeight: 400, marginLeft: 4 }}>
              (内訳合計 {total})
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function BreakdownRow({
  symbol,
  color,
  label,
  value,
  sub,
}: {
  symbol: string;
  color: string;
  label: string;
  value: number;
  sub?: string;
}) {
  const dim = value === 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        gap: 8,
        alignItems: "baseline",
        padding: "3px 0",
        opacity: dim ? 0.5 : 1,
      }}
    >
      <span style={{ color, fontWeight: 700, fontSize: 11 }}>{symbol}</span>
      <span style={{ color: "var(--fg-muted)" }}>
        {label}
        {sub && (
          <span style={{ color: "var(--fg-faint)", marginLeft: 6, fontSize: 10 }}>{sub}</span>
        )}
      </span>
      <span style={{ fontWeight: 700, color: dim ? "var(--fg-faint)" : color }}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}
