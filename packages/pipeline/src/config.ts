export const KEYWORD_WEIGHTS: Record<string, number> = {
  "自作キーボード": 5,
  "メカニカルキーボード": 5,
  "キーボード": 3,
  "mechanical keyboard": 5,
  "split keyboard": 4,
  "qmk": 4,
  "zmk": 4,
  "rust": 5,
  "python": 3,
  "claude": 5,
  "claude code": 5,
  "anthropic": 4,
  "llm": 2,
  "agent": 2,
};

/**
 * 論文のスコアリングに使うキーワード。abstract に対してのみ照合する。
 * GAS 版 KEYWORD_LIST = ["combinatorial", "optimize", "np-hard"] を含む。
 */
export const PAPER_KEYWORDS: Record<string, number> = {
  // GAS 版から取り込み
  "combinatorial": 4,
  "optimize": 2,
  "np-hard": 5,
  // 既存の関連キーワード
  "combinatorial optimization": 5,
  "np hard": 5,
  "optimization": 3,
  "heuristic": 3,
  "metaheuristic": 4,
  "integer programming": 3,
  "approximation algorithm": 3,
  "scheduling": 2,
  "routing": 2,
  "graph algorithm": 2,
};

/**
 * 強い興味があるキーワード（GAS 版 PRIORITIZED_KEYWORD 準拠）。
 * これを含む論文は他の候補より優先して採用する。
 */
export const PAPER_PRIORITY_KEYWORDS = ["np-hard", "np hard"];

/**
 * KEYWORD_WEIGHTS / PAPER_KEYWORDS のキーから canonical なタグ名へのマッピング。
 * ここに無いキーはそのまま (lowercase で) タグになる。
 */
export const TAG_ALIASES: Record<string, string> = {
  "claude code": "claude",
  "anthropic": "claude",
  "combinatorial": "optimization",
  "combinatorial optimization": "optimization",
  "np hard": "np-hard",
};

export interface RssFeedConfig {
  id: string;
  url: string;
  /**
   * 全 item に無条件で加算するスコア。
   * 更新頻度が低いサイトほど高く設定し、稀に投稿されたときに高スコア記事
   * (Qiita 人気で複数キーワード一致したもの等) に埋もれず上位に出るようにする。
   * tier 目安:
   *   0  高頻度 (10+/週)        — Qiita / Zenn の汎用・タグ別フィード
   *   5  中頻度 (5-10/週)       — Greenkeys
   *   12 低頻度 (1-2/週)        — TALPKEYBOARD / Rust Blog / Inside Rust / TWIR
   *   15 超低頻度 (<1/週)       — PEP RSS
   */
  baseScore?: number;
}

export const RSS_FEEDS: RssFeedConfig[] = [
  // 日本語汎用 高頻度 (キーワードでフィルタ)
  { id: "qiita-popular", url: "https://qiita.com/popular-items/feed" },
  { id: "qiita-tag-rust", url: "https://qiita.com/tags/rust/feed" },
  { id: "qiita-tag-python", url: "https://qiita.com/tags/python/feed" },
  { id: "qiita-tag-claude", url: "https://qiita.com/tags/claude/feed" },
  {
    id: "qiita-tag-jisaku-keyboard",
    url: "https://qiita.com/tags/%E8%87%AA%E4%BD%9C%E3%82%AD%E3%83%BC%E3%83%9C%E3%83%BC%E3%83%89/feed",
  },
  { id: "zenn-all", url: "https://zenn.dev/feed" },
  { id: "zenn-topic-rust", url: "https://zenn.dev/topics/rust/feed" },
  { id: "zenn-topic-python", url: "https://zenn.dev/topics/python/feed" },
  { id: "zenn-topic-claude", url: "https://zenn.dev/topics/claude/feed" },
  {
    id: "zenn-topic-jisaku-keyboard",
    url: "https://zenn.dev/topics/%E8%87%AA%E4%BD%9C%E3%82%AD%E3%83%BC%E3%83%9C%E3%83%BC%E3%83%89/feed",
  },
  // 中頻度 (~10/週)
  { id: "greenkeys", url: "https://green-keys.info/feed/", baseScore: 5 },
  // 低頻度 (~1-2/週) — 投稿があった日は上位に押し上げる
  { id: "talpkeyboard", url: "https://www.talpkeyboard.com/feed", baseScore: 12 },
  { id: "rust-blog", url: "https://blog.rust-lang.org/feed.xml", baseScore: 12 },
  { id: "inside-rust", url: "https://blog.rust-lang.org/inside-rust/feed.xml", baseScore: 12 },
  { id: "this-week-in-rust", url: "https://this-week-in-rust.org/rss.xml", baseScore: 12 },
  // 超低頻度 (<1/週)
  { id: "peps", url: "https://peps.python.org/peps.rss", baseScore: 15 },
];

/**
 * 巡回する arXiv カテゴリ。GAS 版 URL_LIST 準拠。
 */
export const ARXIV_CATEGORIES = [
  "cs.DS",
  "cs.CC",
  "math.OC",
  "math.CO",
  "quant-ph",
  // 既存の関心領域
  "cs.AI",
  "cs.LG",
];

export const NEWS_TOP_N = 20;

/**
 * ニュースの最大配信遅延 (時間)。`publishedAt` がこの値より古い item は採用しない。
 * arXiv 側は announceType === "new" でフィルタしているのと対になる挙動。
 * cron が日次 (22 UTC = 07 JST) で動くので 24h で前回実行以降の新着がほぼ拾える。
 */
export const NEWS_MAX_AGE_HOURS = 24;
export const PAPERS_TOP_N = 5;

export const NEWS_SCORE_THRESHOLD = 1;
export const PAPER_SCORE_THRESHOLD = 1;

export const OPENAI_MODEL = "gpt-4o-mini";
