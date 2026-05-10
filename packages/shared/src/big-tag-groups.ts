export type BigTagGroup = "language" | "ai" | "algorithm" | "hobby";

/**
 * canonical タグ → 大タグ (BIG_TAG) のグループ。
 * news ランキングで「大タグごとに最低 1 件」枠を確保するために使う。
 * ここに無い canonical タグの item は news 採用候補から除外される。
 */
export const BIG_TAG_GROUPS: Record<string, BigTagGroup> = {
  // === language ===
  rust: "language",
  python: "language",
  // === ai ===
  llm: "ai",
  claude: "ai",
  "claude-code": "ai",
  anthropic: "ai",
  agent: "ai",
  mcp: "ai",
  // === algorithm ===
  algorithm: "algorithm",
  optimization: "algorithm",
  heuristic: "algorithm",
  "dynamic-programming": "algorithm",
  "graph-algorithm": "algorithm",
  "data-structure": "algorithm",
  "quantum-computing": "algorithm",
  "quantum-algorithm": "algorithm",
  quantum: "algorithm", // 旧データ後方互換 (旧 alias `quantum computing` → `quantum`)
  // === hobby ===
  "キーボード": "hobby",
  qmk: "hobby",
  zmk: "hobby",
  "自作キーボード": "hobby",
  "mechanical-keyboard": "hobby",
  "split-keyboard": "hobby",
  "ergonomic-keyboard": "hobby",
  "key-switch": "hobby",
  "キースイッチ": "hobby",
  "キーキャップ": "hobby",
  math: "hobby",
  "number-theory": "hobby",
  topology: "hobby",
  geometry: "hobby",
  coffee: "hobby",
};

/**
 * 各大タグからの最低採用枠を埋める順序。
 * 並び替えや空 group のスキップに使う。
 */
export const BIG_TAG_GROUP_ORDER = ["language", "ai", "algorithm", "hobby"] as const;
