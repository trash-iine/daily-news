export type SourceFamily =
  | "zenn"
  | "qiita"
  | "arxiv"
  | "hn"
  | "kbd"
  | "rust"
  | "python"
  | "other";

export const SOURCE_LABELS: Record<string, string> = {
  hn: "Hacker News",
  "rss:zenn-all": "Zenn",
  "rss:zenn-topic-claude": "Zenn · Claude",
  "rss:zenn-topic-rust": "Zenn · Rust",
  "rss:zenn-topic-python": "Zenn · Python",
  "rss:zenn-topic-keyboard": "Zenn · 自作キーボード",
  "rss:qiita-popular": "Qiita",
  "rss:qiita-tag-claude": "Qiita · Claude",
  "rss:qiita-tag-rust": "Qiita · Rust",
  "rss:qiita-tag-python": "Qiita · Python",
  "rss:qiita-tag-keyboard": "Qiita · 自作キーボード",
  "rss:greenkeys": "Greenkeys",
  "rss:talpkeyboard": "TALPKEYBOARD",
  "rss:pep": "PEP RSS",
  "rss:rust-blog": "Rust Blog",
  "rss:inside-rust": "Inside Rust",
  "rss:twir": "This Week in Rust",
  "arxiv:cs.DS": "arXiv · cs.DS",
  "arxiv:cs.CC": "arXiv · cs.CC",
  "arxiv:cs.AI": "arXiv · cs.AI",
  "arxiv:cs.LG": "arXiv · cs.LG",
  "arxiv:math.OC": "arXiv · math.OC",
  "arxiv:math.CO": "arXiv · math.CO",
  "arxiv:quant-ph": "arXiv · quant-ph",
};

export const sourceLabel = (s: string): string => SOURCE_LABELS[s] || s;

export const sourceFamily = (s: string): SourceFamily => {
  if (s.startsWith("rss:zenn")) return "zenn";
  if (s.startsWith("rss:qiita")) return "qiita";
  if (s.startsWith("arxiv")) return "arxiv";
  if (s === "hn") return "hn";
  if (s.startsWith("rss:greenkeys") || s.startsWith("rss:talpkeyboard")) return "kbd";
  if (s.startsWith("rss:rust") || s.startsWith("rss:inside-rust") || s.startsWith("rss:twir"))
    return "rust";
  if (s.startsWith("rss:pep")) return "python";
  return "other";
};

export const FAMILY_LABELS: Record<SourceFamily, string> = {
  zenn: "Zenn",
  qiita: "Qiita",
  arxiv: "arXiv",
  hn: "Hacker News",
  kbd: "キーボード ブログ",
  rust: "Rust 一次情報",
  python: "Python 一次情報",
  other: "その他",
};

export const FAMILY_GLYPH: Record<SourceFamily, string> = {
  zenn: "Z",
  qiita: "Q",
  arxiv: "α",
  hn: "Y",
  kbd: "⌨",
  rust: "R",
  python: "py",
  other: "·",
};
