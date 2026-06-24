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
  "model context protocol": 4,
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
  // アルゴリズム/最適化の追加
  "dynamic programming": 3,
  "graph algorithm": 3,
  "data structure": 2,
  // キーボード関連の追加
  "ergonomic keyboard": 4,
  "key switch": 3,
  "キースイッチ": 3,
  "キーキャップ": 3,
  // コーヒー (趣味)
  "coffee": 4,
  "espresso": 4,
  "latte": 2,
  "pour over": 4,
  "single origin": 4,
  "specialty coffee": 5,
  "barista": 3,
  "roaster": 3,
  "コーヒー": 4,
  "珈琲": 4,
  "エスプレッソ": 4,
  "ハンドドリップ": 4,
  "ラテアート": 3,
  "スペシャルティコーヒー": 5,
  "焙煎": 4,
  "バリスタ": 3,
};

/**
 * 論文のスコアリングに使うキーワード。abstract に対してのみ照合する。
 * GAS 版 KEYWORD_LIST = ["combinatorial", "optimize", "np-hard"] を含む。
 */
export const PAPER_KEYWORDS: Record<string, number> = {
  // GAS 版から取り込み
  "combinatorial": 4,
  "optimize": 1, // 汎用語。ノイズ源なので低め
  "np-hard": 5,
  // 既存の関連キーワード
  "combinatorial optimization": 5,
  "np hard": 5,
  "optimization": 2, // 汎用語（ML 論文が多用）。低め
  "heuristic": 4, // 注力テーマ
  "metaheuristic": 5, // 注力テーマ
  "integer programming": 3,
  "approximation algorithm": 3,
  "scheduling": 2,
  "graph algorithm": 3,
  // === 拾う範囲を広げる拡充キーワード ===
  // 具体語（手法名・問題名）はノイズが少ないので weight 高め。
  // メタヒューリスティクス具体手法
  "simulated annealing": 5,
  "tabu search": 5,
  "ant colony": 5,
  "genetic algorithm": 4,
  "particle swarm": 4,
  "evolutionary algorithm": 4,
  "local search": 3,
  // 古典的組合せ最適化問題
  "traveling salesman": 5,
  "vehicle routing": 5,
  "knapsack": 5,
  "graph coloring": 5,
  "max-cut": 5,
  "maxcut": 5,
  "bin packing": 5,
  "set cover": 4,
  "tsp": 4,
  "satisfiability": 4,
  "sat solver": 5, // "sat" 単体は誤一致が多いので採らない
  // 数理最適化・ソルバー系
  "constraint programming": 5,
  "branch and bound": 5,
  "column generation": 5,
  "mixed integer programming": 5,
  "mixed-integer": 4,
  "linear programming": 4,
  "cutting plane": 4,
  // 計算量・厳密アルゴリズム理論
  "parameterized complexity": 5,
  "np-complete": 5,
  "fixed-parameter": 4,
  "exact algorithm": 4,
  "dynamic programming": 3,
  "polynomial-time": 2,
  // 量子コンピューティングは重みづけしない（採択は最低1本保証のみ）。
  // 判定キーワードは PAPER_QUANTUM_KEYWORDS で別管理。
};

/**
 * 強い興味があるキーワード（GAS 版 PRIORITIZED_KEYWORD 準拠）。
 * これを含む論文は他の候補より優先して採用する。
 */
export const PAPER_PRIORITY_KEYWORDS = [
  "np-hard",
  "np hard",
  "metaheuristic",
  "heuristic",
];

/**
 * quantum 判定キーワード (大文字小文字無視・部分一致)。
 * 最低1本保証 (`PAPERS_QUANTUM_MIN`) の候補抽出と、量子論文への
 * `quantum-computing` タグ付け直しに使う (paperFinalists.ts / ranking.ts)。
 * quantum は重みづけしない方針のため `PAPER_KEYWORDS` には含めず、ここで別管理する。
 */
export const PAPER_QUANTUM_KEYWORDS: readonly string[] = [
  "quantum computing",
  "quantum computer",
  "quantum algorithm",
  "quantum information",
  "quantum error correction",
  "qubit",
  "variational quantum",
  "qaoa",
  "vqe",
];

/**
 * KEYWORD_WEIGHTS / PAPER_KEYWORDS のキーから canonical なタグ名へのマッピング。
 * ここに無いキーはそのまま (lowercase で) タグになる。
 *
 * 方針: Recap タブのトレンド分析で細粒度タグが見えるよう、AI / キーボード /
 * algorithm / quantum 系は個別 canonical に分離する。BIG_TAG (4 種) は据え置き。
 * matched 値そのままを canonical にする場合はエントリ省略可 (例: claude / qmk / rust)。
 */
export const TAG_ALIASES: Record<string, string> = {
  // === AI ===
  // claude / anthropic / agent / llm はそのまま canonical (matched 値を使う)
  "claude code": "claude-code",
  "model context protocol": "mcp",

  // === optimization (集約維持) ===
  "combinatorial": "optimization",
  "combinatorial optimization": "optimization",
  "np-hard": "optimization",
  "np hard": "optimization",
  "組合せ最適化": "optimization",
  "組み合わせ最適化": "optimization",
  "数理最適化": "optimization",
  // heuristic 表記揺れ吸収 (heuristic は canonical のまま、metaheuristic を寄せる)
  "metaheuristic": "heuristic",

  // === algorithm 系 (個別化) ===
  "algorithms": "algorithm",
  "アルゴリズム": "algorithm",
  "競技プログラミング": "algorithm",
  "dynamic programming": "dynamic-programming",
  "graph algorithm": "graph-algorithm",
  "data structure": "data-structure",

  // === quantum (2 種に分離) ===
  "quantum computing": "quantum-computing",
  "quantum computer": "quantum-computing",
  "量子コンピュータ": "quantum-computing",
  "量子コンピューティング": "quantum-computing",
  "qubit": "quantum-computing",
  "quantum information": "quantum-computing",
  "quantum error correction": "quantum-computing",
  "qaoa": "quantum-computing",
  "vqe": "quantum-computing",
  "variational quantum": "quantum-computing",
  "quantum algorithm": "quantum-algorithm",

  // === キーボード (個別化、qmk / zmk / 自作キーボード / キーボード / キーキャップ はそのまま canonical) ===
  "メカニカルキーボード": "mechanical-keyboard",
  "mechanical keyboard": "mechanical-keyboard",
  "split keyboard": "split-keyboard",
  "ergonomic keyboard": "ergonomic-keyboard",
  "key switch": "key-switch",
  "キースイッチ": "key-switch",

  // === math (集約 + 一部個別化) ===
  "mathematics": "math",
  "数学": "math",
  "代数": "math",
  "number theory": "number-theory",
  "数論": "number-theory",
  "トポロジー": "topology",
  "幾何": "geometry",
  // topology / geometry はそのまま canonical

  // === coffee (集約維持) ===
  "espresso": "coffee",
  "latte": "coffee",
  "pour over": "coffee",
  "single origin": "coffee",
  "specialty coffee": "coffee",
  "barista": "coffee",
  "roaster": "coffee",
  "珈琲": "coffee",
  "エスプレッソ": "coffee",
  "ハンドドリップ": "coffee",
  "ラテアート": "coffee",
  "スペシャルティコーヒー": "coffee",
  "焙煎": "coffee",
  "バリスタ": "coffee",
  "コーヒー": "coffee",
};

// BIG_TAG_GROUPS / BIG_TAG_GROUP_ORDER は web 側でも使うため @daily-news/shared に置き、
// 既存 import 互換のためここから re-export する。
export { BIG_TAG_GROUPS, BIG_TAG_GROUP_ORDER } from "@daily-news/shared";

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
  /** フィードの主言語。news ランキングで日本語を最優先するために使う。 */
  lang: "ja" | "en";
  /**
   * 英語ソース限定: 公式 / 低頻度の重要発信源として優先する場合 true。
   * 日本語 RSS は常に最優先 tier なので無関係。
   * 例: Rust Blog / Inside Rust / This Week in Rust / PEPs / Google Research /
   *     Shtetl-Optimized は true。Quanta Magazine は false。
   */
  important?: boolean;
}

export const RSS_FEEDS: RssFeedConfig[] = [
  // Qiita / Zenn は専用 API (qiitaApi / zennApi) で liked_count を取得し純人気順にランクする。
  // 中頻度 (~10/週)
  { id: "greenkeys", url: "https://green-keys.info/feed/", baseScore: 5, lang: "ja" },
  // 低頻度 (~1-2/週) — 投稿があった日は上位に押し上げる
  { id: "talpkeyboard", url: "https://www.talpkeyboard.com/feed", baseScore: 12, lang: "ja" },
  { id: "rust-blog", url: "https://blog.rust-lang.org/feed.xml", baseScore: 12, lang: "en", important: true },
  { id: "inside-rust", url: "https://blog.rust-lang.org/inside-rust/feed.xml", baseScore: 12, lang: "en", important: true },
  { id: "this-week-in-rust", url: "https://this-week-in-rust.org/rss.xml", baseScore: 12, lang: "en", important: true },
  // 超低頻度 (<1/週)
  { id: "peps", url: "https://peps.python.org/peps.rss", baseScore: 15, lang: "en", important: true },
  { id: "shtetl-optimized", url: "https://scottaaronson.blog/?feed=rss2", baseScore: 15, lang: "en", important: true },
  // 中頻度 (~5-10/週) — Google Research の研究発表 (OR-Tools / 量子 / アルゴリズム研究を含む)
  { id: "google-research", url: "https://research.google/blog/rss/", baseScore: 5, lang: "en", important: true },
  // 高頻度 / 広域科学ニュース — キーワード一致した記事のみ採用
  { id: "quanta-magazine", url: "https://www.quantamagazine.org/feed/", lang: "en" },
  { id: "nazology", url: "https://nazology.kusuguru.co.jp/feed", lang: "ja" },
  // コーヒー (低〜中頻度)
  // 規約確認済み: typica.jp は robots.txt が User-agent: * 全許可 (/for-app/ のみ Disallow)
  // privacy-policy にも転載・商用利用に関する制限なし。RSS 自体が syndication 用途で公開。
  { id: "typica", url: "https://typica.jp/feed/", baseScore: 12, lang: "ja" },
  // cafict.com (個人ブログ "コーヒーのある暮らしと道具")
  // 規約確認済み: robots.txt は /wp-admin/ のみ Disallow、privacy-policy に転載/商用制限なし。
  // 投稿頻度は低め (2025-07 が最新) なので、新規投稿があった日にだけ浮かぶ想定で baseScore: 12。
  { id: "cafict", url: "https://cafict.com/feed/", baseScore: 12, lang: "ja" },
];

/**
 * news ランキング時の言語ボーナス。merit (popularity + kwScore) に加算して score を決める。
 * 0 = 日本語 (Qiita / Zenn / 日本語 RSS): 最優先で押し上げる
 * 1 = 英語の重要 / 低頻度ソース (Rust 公式 / PEPs / Google Research / Shtetl-Optimized 等):
 *     Japanese 中位と並ぶ程度に押し上げる
 * 2 = それ以外の英語 (HN / Quanta Magazine 等): ボーナスなし。日本語/重要英語が枠を埋め切らないときに採用される。
 */
export const LANGUAGE_BONUS: Record<0 | 1 | 2, number> = {
  0: 15,
  1: 5,
  2: 0,
};

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
 * arXiv Atom API は新着順で返すが、カテゴリによっては 1 回の取得で数日前まで
 * 遡ることがある。publishedAt がこの日数より古い論文を除外して鮮度を担保する。
 * 週末は arXiv のアナウンスが無いため、月曜の取得で金曜投稿 (最大 ~3 日前) を
 * 拾えるよう少し余裕を持たせる。
 */
export const ARXIV_MAX_AGE_DAYS = 4;

/**
 * 巡回する APS (Physical Review) RSS フィード。
 *
 * 規約確認 (CLAUDE.md ルール):
 * - feeds.aps.org は APS が読者向け配信を意図する purpose-built endpoint
 *   (`journals.aps.org/rss_lib.html` に掲載)。
 * - journals.aps.org の robots.txt は Disallow: / だが、対象は journals 本体の
 *   スクレイピング向け。本実装は別ホスト feeds.aps.org の RSS のみ叩く。
 * - 用途: daily aggregator (title + RSS 提供 abstract + DOI link + 出所明示)。
 *   本文 PDF は保存しない。
 *
 * quantumOnly === true のフィードは title + abstract に量子関連語が含まれる
 * item のみ採用 (PRL/PRA/PRX/PRResearch は分野が広いため)。
 */
export const APS_FEEDS: { id: string; url: string; quantumOnly: boolean }[] = [
  { id: "prxquantum", url: "http://feeds.aps.org/rss/recent/prxquantum.xml", quantumOnly: false },
  { id: "prl", url: "http://feeds.aps.org/rss/recent/prl.xml", quantumOnly: true },
  { id: "pra", url: "http://feeds.aps.org/rss/recent/pra.xml", quantumOnly: true },
  { id: "prx", url: "http://feeds.aps.org/rss/recent/prx.xml", quantumOnly: true },
  { id: "prresearch", url: "http://feeds.aps.org/rss/recent/prresearch.xml", quantumOnly: true },
];

/**
 * APS フィードは arXiv の announce_type=new 相当のフィルタが無いため、
 * 直近 N 日以内に published された item のみ採用する。
 */
export const APS_PAPER_MAX_AGE_DAYS = 7;

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
  "数理最適化",
];

/**
 * Zenn 非公式 API (https://zenn.dev/api/articles?order=liked_count&topicname=<topic>) で取得するトピック。
 * RSS では liked_count が取れないため、人気順ランキングには API が必須。
 */
export const ZENN_API_TOPICS: string[] = [
  "rust",
  "python",
  "claude",
  "自作キーボード",
  "algorithm",
  "競技プログラミング",
  "quantum",
  "optimization",
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
  "ergonomic keyboard",
  "split keyboard",
  "combinatorial optimization",
  "quantum computing",
  "quantum algorithm",
  "algorithm",
  "dynamic programming",
  "np hard",
];

/**
 * 1 日の news 採用件数 (合計)。
 * 採用ロジックは `BIG_TAG_GROUPS` の各 group から最低 `NEWS_MIN_PER_GROUP` 件を確保し、
 * 残り枠を全体の人気スコア降順で埋める。
 */
export const NEWS_TOP_N = 25;
export const NEWS_MIN_PER_GROUP = 1;

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

/**
 * 1 日の論文採用件数 (arXiv + APS 合算)。
 * 上位スコア順で `PAPERS_TOP_N` 件を選ぶ (main.ts:rankPapers)。
 * APS 最低保証は撤廃し、APS もスコア競争で採否を決める。
 */
export const PAPERS_TOP_N = 5;

/**
 * 1 日に最低限採用する quantum 系論文の件数。quantum は重みづけしない方針のため
 * 自然採択ではゼロになりうる。`selectFinalists` で finalists に quantum が
 * `PAPERS_QUANTUM_MIN` 件未満なら、閾値前の quantum 候補から補充して floor を
 * 満たす (paperFinalists.ts)。
 */
export const PAPERS_QUANTUM_MIN = 1;

export const NEWS_SCORE_THRESHOLD = 1;
export const PAPER_SCORE_THRESHOLD = 1;

/**
 * 世間トレンド (Qiita / Zenn / HN trending) から「今日のニュース」に追加する高トレンド枠の件数。
 * 興味タグに無関係でも velocity (勢い) 上位の item を NEWS_TOP_N とは別枠で append する
 * (main.ts: selectTrendingNews)。興味ニュースの枠は奪わない。
 */
export const NEWS_TRENDING_TOP_N = 3;

/**
 * トレンド枠の velocityScore 下限。勢いの弱い日に無理に枠を埋めないためのフロア。
 * 0 にすると実質 velocity > 0 の全件が候補になる。velocity は概ね 0〜30 のレンジ
 * (3*√likes / HN cap 15 由来)。
 */
export const NEWS_TRENDING_MIN_VELOCITY = 5;

/**
 * 論文スコアに加える多様性ボーナス。異なるキーワードに複数ヒットした論文
 * （複数テーマに合致＝関連度が高い）を、単一語を連投しているだけの論文より
 * 上位に押し上げる。`rankPapers` で `(matched.length - 1) * この値` を加算する
 * (ranking.ts)。news スコアには効かせない。
 */
export const PAPER_MULTI_MATCH_BONUS = 2;

export const OPENAI_MODEL = "gpt-4o-mini";

/**
 * site-wide 週間トレンド (Qiita / Zenn / HN) のスナップショット設定。
 * Recap 「トレンドタグ」セクションで使う。`bundle.items` (個人嗜好で絞り込み済み) とは
 * 独立した別データ。
 *
 * - `TRENDING_PER_SOURCE`: 各サイトから取得する 1 日あたりの件数
 * - `TRENDING_LOOKBACK_HOURS`: lookback 期間 (HN の Algolia は時刻フィルタ、Qiita は created:>YYYY-MM-DD)
 * - `QIITA_TRENDING_MIN_STOCKS`: Qiita の `stocks:>N` 閾値。ノイズ除外用の弱フィルタ
 */
export const TRENDING_PER_SOURCE = 30;
export const TRENDING_LOOKBACK_HOURS = 168;
export const QIITA_TRENDING_MIN_STOCKS = 1;
