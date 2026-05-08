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

export const FAM_COLOR: Record<string, string> = {
  zenn: "oklch(0.6 0.15 235)",
  qiita: "oklch(0.62 0.18 145)",
  arxiv: "oklch(0.55 0.18 25)",
  hn: "oklch(0.65 0.19 50)",
  rust: "oklch(0.58 0.18 35)",
  python: "oklch(0.58 0.15 230)",
  reddit: "oklch(0.65 0.21 20)",
  github: "oklch(0.5 0.04 270)",
  kbd: "oklch(0.58 0.16 300)",
  other: "oklch(0.55 0.02 60)",
};

const SOURCE_LABELS: Record<string, string> = {
  hn: "Hacker News",
  "hn:claude": "HN · Claude",
  "hn:anthropic": "HN · Anthropic",
  "hn:rust": "HN · Rust",
  "hn:python": "HN · Python",
  "hn:qmk": "HN · QMK",
  "hn:algorithm": "HN · Algorithm",
  "rss:zenn-all": "Zenn",
  "zenn-api:claude": "Zenn · Claude",
  "zenn-api:rust": "Zenn · Rust",
  "zenn-api:python": "Zenn · Python",
  "rss:qiita-popular": "Qiita",
  "qiita-api:claude": "Qiita · Claude",
  "qiita-api:rust": "Qiita · Rust",
  "qiita-api:python": "Qiita · Python",
  "rss:greenkeys": "Greenkeys",
  "rss:talpkeyboard": "TALPKEYBOARD",
  "rss:rust-blog": "Rust Blog",
  "rss:inside-rust": "Inside Rust",
  "rss:this-week-in-rust": "This Week in Rust",
  "rss:twir": "This Week in Rust",
  "rss:pep": "PEP RSS",
  "github-trending:rust": "GitHub · Rust",
  "reddit:Python": "Reddit · Python",
  "reddit:ClaudeAI": "Reddit · ClaudeAI",
  "arxiv:cs.DS": "arXiv · cs.DS",
  "arxiv:cs.CC": "arXiv · cs.CC",
  "arxiv:cs.AI": "arXiv · cs.AI",
  "arxiv:cs.LG": "arXiv · cs.LG",
  "arxiv:math.OC": "arXiv · math.OC",
  "arxiv:math.CO": "arXiv · math.CO",
  "arxiv:quant-ph": "arXiv · quant-ph",
};

export const sourceLabel = (s: string): string => SOURCE_LABELS[s] ?? s;

export const sourceFamily = (s: string): string => {
  if (s === "hn" || s.startsWith("hn:")) return "hn";
  if (s.startsWith("arxiv:")) return "arxiv";
  if (s.startsWith("rss:zenn") || s.startsWith("zenn-api:")) return "zenn";
  if (s.startsWith("rss:qiita") || s.startsWith("qiita-api:")) return "qiita";
  if (s.startsWith("reddit:")) return "reddit";
  if (s.startsWith("github-trending")) return "github";
  if (s.startsWith("rss:greenkeys") || s.startsWith("rss:talpkeyboard")) return "kbd";
  if (s === "rss:rust-blog" || s === "rss:inside-rust" || s === "rss:this-week-in-rust" || s === "rss:twir") return "rust";
  if (s === "rss:pep") return "python";
  return "other";
};

export const fmtRel = (iso: string, nowMs: number): string => {
  const d = new Date(iso).getTime();
  const h = Math.round((nowMs - d) / 36e5);
  if (h < 1) return "たった今";
  if (h < 24) return `${h}時間前`;
  return `${Math.round(h / 24)}日前`;
};

export const fmtDateBadge = (iso: string): string => {
  const d = new Date(iso);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} ${wd}`;
};

export const hostFromUrl = (u: string): string => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
