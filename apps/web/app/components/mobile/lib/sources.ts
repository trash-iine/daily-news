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
  game: "oklch(0.6 0.15 160)",
  other: "oklch(0.55 0.02 60)",
};

export const FAM_GLYPH: Record<string, string> = {
  zenn: "Z",
  qiita: "Q",
  arxiv: "α",
  hn: "Y",
  rust: "R",
  python: "py",
  reddit: "r/",
  github: "gh",
  kbd: "⌨",
  game: "▦",
  other: "·",
};

/**
 * source 文字列の固定ラベル。RSS フィードの表示名と、prefix 生成 (下記 sourceLabel)
 * で賄えない特殊 ID をここに置く。旧 bundle にのみ現れる legacy ID
 * (rss:zenn-all / rss:qiita-popular / reddit:* / github-trending:* 等) も
 * 過去日表示のために残している。
 */
const SOURCE_LABELS: Record<string, string> = {
  hn: "Hacker News",
  "hn-trending": "HN · Trending",
  "qiita-trending": "Qiita · Trending",
  "zenn-trending": "Zenn · Trending",
  "rss:greenkeys": "Greenkeys",
  "rss:talpkeyboard": "TALPKEYBOARD",
  "rss:rust-blog": "Rust Blog",
  "rss:inside-rust": "Inside Rust",
  "rss:this-week-in-rust": "This Week in Rust",
  "rss:thinky-games": "Thinky Games",
  "rss:peps": "PEP RSS",
  "rss:quanta-magazine": "Quanta Magazine",
  "rss:nazology": "Nazology",
  "rss:google-research": "Google Research",
  "rss:shtetl-optimized": "Shtetl-Optimized",
  "rss:typica": "TYPICA",
  "rss:cafict": "CAFICT",
  "aps:prl": "APS · PRL",
  "aps:pra": "APS · PRA",
  "aps:prx": "APS · PRX",
  "aps:prxquantum": "APS · PRX Quantum",
  "aps:prresearch": "APS · PRResearch",
  // legacy (旧 bundle 専用)
  "rss:zenn-all": "Zenn",
  "rss:qiita-popular": "Qiita",
  "github-trending:rust": "GitHub · Rust",
  "reddit:Python": "Reddit · Python",
  "reddit:ClaudeAI": "Reddit · ClaudeAI",
};

/**
 * 表示ラベル。固定マップ優先、無ければ prefix からの自動生成
 * (qiita-api:rust → "Qiita · rust" 等)。config.ts のタグ/クエリ追加のたびに
 * ここへ列挙しなくて済むようにする。
 */
export const sourceLabel = (s: string): string => {
  const fixed = SOURCE_LABELS[s];
  if (fixed) return fixed;
  const prefixed = /^(qiita-api|zenn-api|hn|arxiv):(.+)$/.exec(s);
  if (prefixed) {
    const head = { "qiita-api": "Qiita", "zenn-api": "Zenn", hn: "HN", arxiv: "arXiv" }[
      prefixed[1] as "qiita-api" | "zenn-api" | "hn" | "arxiv"
    ];
    return `${head} · ${prefixed[2]}`;
  }
  return s;
};

export const sourceFamily = (s: string): string => {
  if (s === "hn" || s === "hn-trending" || s.startsWith("hn:")) return "hn";
  if (s.startsWith("arxiv:") || s.startsWith("aps:")) return "arxiv";
  if (s === "zenn-trending" || s.startsWith("rss:zenn") || s.startsWith("zenn-api:")) return "zenn";
  if (s === "qiita-trending" || s.startsWith("rss:qiita") || s.startsWith("qiita-api:")) return "qiita";
  if (s.startsWith("reddit:")) return "reddit";
  if (s.startsWith("github-trending")) return "github";
  if (s.startsWith("rss:greenkeys") || s.startsWith("rss:talpkeyboard")) return "kbd";
  if (s === "rss:rust-blog" || s === "rss:inside-rust" || s === "rss:this-week-in-rust") return "rust";
  if (s === "rss:peps") return "python";
  if (s === "rss:thinky-games") return "game";
  return "other";
};
