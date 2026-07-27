/**
 * スコア 3 軸の色。ScoreBreakdown (論文の展開部) / PopularityBadge / InterestBadge /
 * ScoreBar (ニュースの積み上げバー) で共有する。色がずれると軸の対応が読めなくなるのでここに集約。
 */
export const SCORE_COLOR = {
  /** ♡ トレンド (popularity) */
  popularity: "oklch(0.62 0.18 15)",
  /** ★ 興味マッチ (keywordScore) */
  keyword: "oklch(0.68 0.16 80)",
  /** ja/en 言語ボーナス (languageBonus) */
  language: "oklch(0.6 0.1 200)",
} as const;
