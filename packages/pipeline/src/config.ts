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
  "claude": 3,
  "claude code": 3,
  "anthropic": 3,
  "llm": 2,
  "agent": 2,
  // アルゴリズム / 組合せ最適化
  "algorithm": 3,
  "algorithms": 3,
  "combinatorial optimization": 5,
  "optimization": 2,
  "heuristic": 3,
  "metaheuristic": 4,
  "np-hard": 5,
  "アルゴリズム": 3,
  "競技プログラミング": 3,
  "組合せ最適化": 5,
  "組み合わせ最適化": 5,
  "数理最適化": 4,
  // 量子コンピュータ
  "quantum computing": 5,
  "quantum computer": 5,
  "quantum algorithm": 5,
  "量子コンピュータ": 5,
  "量子コンピューティング": 5,
  // 数学 (score.ts は ASCII を \b 区切りで照合するため、math と mathematics は別エントリが必要)
  "mathematics": 3,
  "math": 2,
  "number theory": 4,
  "topology": 3,
  "geometry": 2,
  "数学": 3,
  "数論": 4,
  "幾何": 3,
  "代数": 3,
  "トポロジー": 3,
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
  "組合せ最適化": "optimization",
  "組み合わせ最適化": "optimization",
  "数理最適化": "optimization",
  "quantum computing": "quantum",
  "quantum computer": "quantum",
  "quantum algorithm": "quantum",
  "量子コンピュータ": "quantum",
  "量子コンピューティング": "quantum",
  "algorithms": "algorithm",
  "アルゴリズム": "algorithm",
  "競技プログラミング": "algorithm",
  "mathematics": "math",
  "数学": "math",
  "数論": "math",
  "幾何": "math",
  "代数": "math",
  "topology": "math",
  "トポロジー": "math",
  "geometry": "math",
  "number theory": "math",
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
  // 日本語汎用 高頻度 (キーワードでフィルタ) — Qiita タグ別は API、Zenn トピック別は公式 RSS
  { id: "qiita-popular", url: "https://qiita.com/popular-items/feed" },
  { id: "zenn-all", url: "https://zenn.dev/feed" },
  // Zenn トピック別 公式 RSS (zenn.dev/topics/<topic>/feed)。
  // baseScore=3 はトピック一致を「キーワード重み 3 相当」として扱う近似。
  { id: "zenn-rust", url: "https://zenn.dev/topics/rust/feed", baseScore: 3 },
  { id: "zenn-python", url: "https://zenn.dev/topics/python/feed", baseScore: 3 },
  { id: "zenn-claude", url: "https://zenn.dev/topics/claude/feed", baseScore: 3 },
  { id: "zenn-keyboard", url: "https://zenn.dev/topics/%E8%87%AA%E4%BD%9C%E3%82%AD%E3%83%BC%E3%83%9C%E3%83%BC%E3%83%89/feed", baseScore: 3 },
  { id: "zenn-algorithm", url: "https://zenn.dev/topics/algorithm/feed", baseScore: 3 },
  { id: "zenn-kyopro", url: "https://zenn.dev/topics/%E7%AB%B6%E6%8A%80%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0/feed", baseScore: 3 },
  { id: "zenn-quantum", url: "https://zenn.dev/topics/quantum/feed", baseScore: 3 },
  // 中頻度 (~10/週)
  { id: "greenkeys", url: "https://green-keys.info/feed/", baseScore: 5 },
  // 低頻度 (~1-2/週) — 投稿があった日は上位に押し上げる
  { id: "talpkeyboard", url: "https://www.talpkeyboard.com/feed", baseScore: 12 },
  { id: "rust-blog", url: "https://blog.rust-lang.org/feed.xml", baseScore: 12 },
  { id: "inside-rust", url: "https://blog.rust-lang.org/inside-rust/feed.xml", baseScore: 12 },
  { id: "this-week-in-rust", url: "https://this-week-in-rust.org/rss.xml", baseScore: 12 },
  // 超低頻度 (<1/週)
  { id: "peps", url: "https://peps.python.org/peps.rss", baseScore: 15 },
  { id: "shtetl-optimized", url: "https://scottaaronson.blog/?feed=rss2", baseScore: 15 },
  // 中頻度 (~5-10/週) — Google Research の研究発表 (OR-Tools / 量子 / アルゴリズム研究を含む)
  { id: "google-research", url: "https://research.google/blog/rss/", baseScore: 5 },
  // 高頻度 / 広域科学ニュース — キーワード一致した記事のみ採用
  { id: "quanta-magazine", url: "https://www.quantamagazine.org/feed/" },
  { id: "nazology", url: "https://nazology.kusuguru.co.jp/feed" },
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

/**
 * タイトル or 本文にいずれかが含まれる item は除外する。
 * プロモーション系 / アフィリエイト記事を切り捨てる用途。
 * ASCII / 非 ASCII の両方を扱える (score.ts と同じ規約)。
 */
export const NEGATIVE_KEYWORDS: string[] = [
  "sponsored",
  "アフィリエイト",
  "プロモーション",
  "pr記事",
];

/**
 * Qiita API v2 (https://qiita.com/api/v2/items) で取得するタグ。
 * 各タグごとに `query=tag:<tag>+created:>YYYY-MM-DD` で取得し、likes_count を baseScore に折り込む。
 * RSS のタグ別フィードでは LGTM が取れないため、トレンド指標を活かすために API に切り替えた。
 */
export const QIITA_API_TAGS: string[] = [
  "rust",
  "python",
  "claude",
  "自作キーボード",
  "アルゴリズム",
  "競技プログラミング",
  "量子コンピュータ",
];

/**
 * Hacker News (Algolia HN Search API) で検索するクエリ。
 * 各クエリは個別 API 呼び出しで `NEWS_MAX_AGE_HOURS` 内の story を取得する。
 * KEYWORD_WEIGHTS の英語トークンに合わせる。
 */
export const HN_QUERIES: string[] = [
  "claude",
  "anthropic",
  "rust",
  "python",
  "mechanical keyboard",
  "qmk",
  "zmk",
  "combinatorial optimization",
  "quantum computing",
  "quantum algorithm",
  "algorithm",
];

export const NEWS_TOP_N = 20;

/**
 * ニュースの最大配信遅延 (時間)。`publishedAt` がこの値より古い item は採用しない。
 * arXiv 側は announceType === "new" でフィルタしているのと対になる挙動。
 * 168h (= 7 日) — 直近 1 週間まで拾い、トレンド指標 (LGTM / いいね / HN points) で
 * 浮かせる。同記事の再掲は `loadRecentNewsIds` による cross-day dedup で防ぐ。
 */
export const NEWS_MAX_AGE_HOURS = 168;

/**
 * 「過去に取得済み」と見做す範囲の日数。`main` の seen 構築で使う。
 */
export const NEWS_SEEN_LOOKBACK_DAYS = 7;
export const PAPERS_TOP_N = 5;

export const NEWS_SCORE_THRESHOLD = 1;
export const PAPER_SCORE_THRESHOLD = 1;

export const OPENAI_MODEL = "gpt-4o-mini";
