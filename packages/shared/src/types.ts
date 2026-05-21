export type ItemKind = "news" | "paper";

export interface BaseItem {
  id: string;
  kind: ItemKind;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  score: number;
  source: string;
  publishedAt: string;
  fetchedAt: string;
  thumbnail?: string;
  /**
   * 論文 (kind: "paper") の著者リスト。表示用に正規化済み (FAMILY, F. 形式の短縮ありえる)。
   * arXiv RSS の <atom:author><atom:name> を拾う。APS RSS には付かないので undefined のまま。
   * news kind では基本的に undefined。
   */
  authors?: string[];
  /**
   * ソース固有の人気指標 (Qiita LGTM / Zenn いいね / HN points / RSS feed weight) を
   * 共通レンジに正規化した値。キーワード加点・言語ボーナスは含まない世間ベースのスコア。
   * Recap タブの「世間のトレンド」モード用。2026-05-20 以降の bundle に付与される。
   */
  popularity?: number;
  /**
   * KEYWORD_WEIGHTS / PAPER_KEYWORDS によるキーワードマッチ加点 (title 2x ブースト後の合計)。
   * 興味バイアスの寄与分。2026-05-21 以降の bundle に付与される。
   */
  keywordScore?: number;
  /**
   * ソース言語/重要度ボーナス。日本語 +15 / 英語重要 +5 / それ以外 0。
   * 2026-05-21 以降の bundle に付与される。
   */
  languageBonus?: number;
  /**
   * 採点時に実際にマッチした canonical キーワード一覧。
   * popularity-only ソース (HN / 一部 RSS) では空配列。
   * 2026-05-21 以降の bundle に付与される。
   */
  matchedKeywords?: string[];
  /**
   * 人気指標の生値表示用ラベル (例: "Qiita LGTM 17", "HN 64pt", "Zenn ♥ 23")。
   * popularity と組み合わせて UI のバッジに使う。生値が取れないソースでは undefined。
   * 2026-05-21 以降の bundle に付与される。
   */
  popularityLabel?: string;
}

/**
 * site-wide 週間トレンド (Qiita / Zenn / Hacker News) のスナップショット。
 * `BaseItem` と違い興味タグ・KEYWORD_WEIGHTS で絞らない世間ベースのデータで、
 * Recap タブ「トレンドタグ」の集計に使う。2026-05-22 以降の bundle に付与される。
 *
 * BaseItem 流用は `kind / summary / score / keywordScore` 等が無意味になり JSON が
 * 肥大するため別型にしている。
 */
export interface TrendingItem {
  /** `qiita-trending` | `zenn-trending` | `hn-trending` */
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  fetchedAt: string;
  /** popularityScore (sqrt スケール) で正規化済みの人気指標。BaseItem.popularity と同 scale */
  popularity: number;
  /** Qiita LGTM / Zenn ♥ の生値 (HN は points が cap 後の値なので未設定) */
  popularityRaw?: number;
  /** canonical 化済みタグ (TAG_ALIASES のみ通し、KEYWORD_WEIGHTS マッチは通さない)。HN は常に空配列 */
  tags: string[];
}

export interface DailyBundle {
  date: string;
  generatedAt: string;
  items: BaseItem[];
  /**
   * site-wide 週間トレンドのスナップショット。Recap 「トレンドタグ」セクション専用。
   * 2026-05-22 以降の bundle に付与される。それ以前の bundle では undefined。
   */
  trending?: TrendingItem[];
}

export interface DailyIndex {
  dates: string[];
  updatedAt: string;
}
