export type BigTagGroup = "language" | "ai" | "algorithm" | "hobby";

/**
 * canonical タグ → 大タグ (BIG_TAG) のグループ。
 * news ランキングで「大タグごとに最低 1 件」枠を確保するために使う。
 * ここに無い canonical タグの item は news 採用候補から除外される。
 */
export const BIG_TAG_GROUPS: Record<string, BigTagGroup> = {
  rust: "language",
  python: "language",
  llm: "ai",
  optimization: "algorithm",
  algorithm: "algorithm",
  quantum: "algorithm",
  math: "hobby",
  "キーボード": "hobby",
  coffee: "hobby",
};

/**
 * 各大タグからの最低採用枠を埋める順序。
 * 並び替えや空 group のスキップに使う。
 */
export const BIG_TAG_GROUP_ORDER = ["language", "ai", "algorithm", "hobby"] as const;
