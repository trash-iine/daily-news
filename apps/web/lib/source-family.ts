export type SourceFamily =
  | "zenn"
  | "qiita"
  | "arxiv"
  | "hn"
  | "kbd"
  | "rust"
  | "python"
  | "reddit"
  | "github"
  | "other";

export const SOURCE_LABELS: Record<string, string> = {
  hn: "Hacker News",
  "hn:claude": "HN · Claude",
  "hn:anthropic": "HN · Anthropic",
  "hn:rust": "HN · Rust",
  "hn:python": "HN · Python",
  "hn:qmk": "HN · QMK",
  "hn:algorithm": "HN · Algorithm",
  "rss:zenn-all": "Zenn",
  "rss:zenn-claude": "Zenn · Claude",
  "rss:zenn-rust": "Zenn · Rust",
  "rss:zenn-python": "Zenn · Python",
  "rss:zenn-topic-claude": "Zenn · Claude",
  "rss:zenn-topic-rust": "Zenn · Rust",
  "rss:zenn-topic-python": "Zenn · Python",
  "rss:zenn-topic-keyboard": "Zenn · 自作キーボード",
  "zenn-api:claude": "Zenn API · Claude",
  "zenn-api:rust": "Zenn API · Rust",
  "zenn-api:python": "Zenn API · Python",
  "rss:qiita-popular": "Qiita",
  "rss:qiita-tag-claude": "Qiita · Claude",
  "rss:qiita-tag-rust": "Qiita · Rust",
  "rss:qiita-tag-python": "Qiita · Python",
  "rss:qiita-tag-keyboard": "Qiita · 自作キーボード",
  "qiita-api:claude": "Qiita API · Claude",
  "qiita-api:rust": "Qiita API · Rust",
  "qiita-api:python": "Qiita API · Python",
  "rss:greenkeys": "Greenkeys",
  "rss:talpkeyboard": "TALPKEYBOARD",
  "rss:pep": "PEP RSS",
  "rss:rust-blog": "Rust Blog",
  "rss:inside-rust": "Inside Rust",
  "rss:twir": "This Week in Rust",
  "rss:this-week-in-rust": "This Week in Rust",
  "github-trending:rust": "GitHub Trending · Rust",
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

export const sourceLabel = (s: string): string => SOURCE_LABELS[s] || s;

export const sourceFamily = (s: string): SourceFamily => {
  if (s === "hn" || s.startsWith("hn:")) return "hn";
  if (s.startsWith("arxiv:")) return "arxiv";
  if (s.startsWith("rss:zenn") || s.startsWith("zenn-api:")) return "zenn";
  if (s.startsWith("rss:qiita") || s.startsWith("qiita-api:")) return "qiita";
  if (s.startsWith("reddit:")) return "reddit";
  if (s.startsWith("github-trending")) return "github";
  if (s.startsWith("rss:greenkeys") || s.startsWith("rss:talpkeyboard")) return "kbd";
  if (
    s === "rss:rust-blog" ||
    s === "rss:inside-rust" ||
    s === "rss:this-week-in-rust" ||
    s === "rss:twir"
  )
    return "rust";
  if (s === "rss:pep") return "python";
  return "other";
};

export const FAMILY_LABELS: Record<SourceFamily, string> = {
  zenn: "Zenn",
  qiita: "Qiita",
  arxiv: "arXiv",
  hn: "Hacker News",
  kbd: "キーボード ブログ",
  rust: "Rust 公式",
  python: "Python 公式",
  reddit: "Reddit",
  github: "GitHub Trending",
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
  reddit: "r/",
  github: "GH",
  other: "·",
};
