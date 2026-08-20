import { BIG_TAG_GROUPS, type BaseItem, type BigTagGroup } from "@daily-news/shared";

export interface BigTagDef {
  id: BigTagGroup;
  label: string;
  color: string;
  emoji: string;
  desc: string;
}

export const BIG_TAGS: BigTagDef[] = [
  { id: "language",  label: "言語",         color: "oklch(0.58 0.15 230)", emoji: "</>", desc: "Rust / Python など言語・ランタイム" },
  { id: "ai",        label: "AI",           color: "oklch(0.6 0.16 295)",  emoji: "✦",   desc: "LLM・Claude・MCP・エージェント" },
  { id: "algorithm", label: "アルゴリズム", color: "oklch(0.6 0.14 75)",   emoji: "∑",   desc: "最適化・量子計算・理論" },
  { id: "hobby",     label: "趣味",         color: "oklch(0.6 0.14 320)",  emoji: "♥",   desc: "キーボード・数学・コーヒー" },
  { id: "game",      label: "ゲーム",       color: "oklch(0.6 0.15 160)",  emoji: "▦",   desc: "パズル・シンキーゲーム" },
];

export const BIG_COLOR: Record<BigTagGroup, string> = Object.fromEntries(
  BIG_TAGS.map((t) => [t.id, t.color]),
) as Record<BigTagGroup, string>;

export const bigTagOf = (t: string): BigTagGroup | null => BIG_TAG_GROUPS[t] ?? null;

export const itemBigTags = (it: BaseItem): BigTagGroup[] => {
  const set = new Set<BigTagGroup>();
  for (const t of it.tags) {
    const g = bigTagOf(t);
    if (g) set.add(g);
  }
  return [...set];
};
