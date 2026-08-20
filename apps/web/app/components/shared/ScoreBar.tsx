"use client";
import type { CSSProperties } from "react";
import type { BaseItem } from "@daily-news/shared";
import { SCORE_COLOR } from "./lib/scoreColors";

/** 大タグが付いていない item の評価バー色。RecapScreen / Tag と同じ中性色。 */
export const NEUTRAL_SCORE_COLOR = "oklch(0.55 0.02 60)";

/**
 * ニュースカードの評価バー。バー全体の長さは score / リスト内最大値で、
 * その中をトレンド♡ / 興味マッチ★ / 言語ボーナス の 3 色で積み上げる。
 *
 * score と内訳合計は一致しないことがある (トレンド枠は score が時間減衰後の velocityScore
 * なのに対し popularity は減衰前の生値)。セグメントは「合計に対する比率」で描き、
 * バー全体の長さは常に score に合わせることで、バー長と右の数値が食い違わないようにする。
 * 内訳フィールドの無い旧データ (2026-05-21 以前) は大タグ色の単色バーにフォールバックする。
 */
export function ScoreBar({
  item,
  scale,
  color,
  style,
}: {
  item: BaseItem;
  /** 評価バーの分母 (リスト内の最大 news score)。lib/bundle の newsScoreScale。 */
  scale: number;
  color: string;
  /** 呼び出し側のレイアウト事情 (grid 配置など) を差し込むための追加スタイル。 */
  style?: CSSProperties;
}) {
  const total = Math.max(0, Math.min(100, (item.score / scale) * 100));
  const parts = [
    { key: "popularity", value: item.popularity ?? 0, color: SCORE_COLOR.popularity },
    { key: "keyword", value: item.keywordScore ?? 0, color: SCORE_COLOR.keyword },
    { key: "language", value: item.languageBonus ?? 0, color: SCORE_COLOR.language },
  ].filter((p) => p.value > 0);
  const sum = parts.reduce((a, p) => a + p.value, 0);
  const stacked = sum > 0;
  const hasParts =
    item.popularity !== undefined ||
    item.keywordScore !== undefined ||
    item.languageBonus !== undefined;
  // トレンド枠は score が時間減衰後なので内訳合計と食い違う。ScoreBreakdown と同じ書式で併記する。
  const tip = hasParts
    ? `トレンド ♡${item.popularity ?? 0} / 興味 ★${item.keywordScore ?? 0} / 言語 +${item.languageBonus ?? 0} → 合計 ${item.score}${
        sum !== item.score ? ` (内訳合計 ${sum})` : ""
      }`
    : `合計スコア ${item.score}`;
  return (
    <div
      title={tip}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 10,
        ...style,
      }}
    >
      <div
        role="meter"
        aria-label="評価スコア"
        aria-valuenow={item.score}
        aria-valuemin={0}
        aria-valuemax={scale}
        style={{
          flex: 1,
          height: 5,
          borderRadius: 999,
          // 積み上げ時に大タグ色が混ざると 4 色目に見えるので、トラックは中性色にする。
          background: stacked
            ? "var(--bg-sunken)"
            : `color-mix(in oklch, ${color} 10%, var(--bg-sunken))`,
          overflow: "hidden",
        }}
      >
        {/* 両端だけ丸め、セグメント同士は角無しで突き合わせる。 */}
        <div
          style={{
            display: "flex",
            height: "100%",
            width: `${total}%`,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          {stacked ? (
            parts.map((p) => (
              <div key={p.key} style={{ width: `${(p.value / sum) * 100}%`, background: p.color }} />
            ))
          ) : (
            <div style={{ width: "100%", background: color }} />
          )}
        </div>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--fg-muted)",
          fontFeatureSettings: '"tnum"',
          minWidth: 20,
          textAlign: "right",
        }}
      >
        {item.score}
      </span>
    </div>
  );
}
