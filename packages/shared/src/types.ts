export type ItemKind = "news" | "paper";

/**
 * 論文要約の構造化版。技術と問題 / 問題 / 手法 / 結果 のブロックで OpenAI から JSON で受け取る。
 * abstract が取れなかった/JSON parse に失敗した場合は undefined のまま
 * (UI は従来の summary フィールドを表示)。2026-05-27 以降の bundle に付与される。
 */
export interface PaperSummaryStruct {
  /**
   * 扱っている技術と問題を簡潔にまとめた 1 文。一覧でひと目で内容がつかめる用途で、
   * UI は折りたたみ状態のカードでもこれを表示する。2026-06-11 以降の bundle に付与される。
   * それ以前のデータには無いので optional。
   */
  topic?: string;
  /** 解こうとしている問題・課題 (1〜2 文)。 */
  problem: string;
  /** 提案手法の核となるアイデアと、なぜそれが問題に効くのか (2〜3 文)。 */
  method: string;
  /** 得られた定量的な成果・評価結果 (1〜2 文)。 */
  result: string;
}

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
   * 論文 (kind: "paper") の構造化要約。技術と問題/問題/手法/結果 のセクション。
   * 旧データには無いので optional。UI は struct があればそちらを優先表示し、
   * 無ければ summary を表示する (後方互換)。
   */
  summaryStruct?: PaperSummaryStruct;
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
  /**
   * 採択会議・掲載誌の表示名 (例: "FOCS 2026", "SIAM J. Comput.", "ECCC")。
   * 会議採択論文 / 論文誌新着由来の paper にのみ付き、UI は「採択論文・論文誌」セクションに
   * 分けて表示する。通常の arXiv 新着には付かない。2026-10-24 以降の bundle に付与される。
   */
  venue?: string;
  /** 会議採択論文のとき、会議別ページ (`/venues/{slug}`) の slug。論文誌由来では undefined。 */
  venueSlug?: string;
}

/** 会議採択論文 1 件。`data/venues/{slug}.json` の `papers` 要素。 */
export interface VenuePaper {
  title: string;
  /** 表示用の著者リスト (所属は落とす)。 */
  authors: string[];
  /** arXiv 版が見つかった場合の ID (バージョン無し)。 */
  arxivId?: string;
  /** arXiv 版が初めて見つかった日 (JST, YYYY-MM-DD)。 */
  arxivFoundOn?: string;
  /** PAPER_KEYWORDS による関連度。arXiv abstract が取れるまではタイトルのみで採点。 */
  score: number;
  matchedKeywords: string[];
  summary?: string;
  summaryStruct?: PaperSummaryStruct;
  /** どこから知ったか。採択リスト / arXiv comments ("To appear in ...")。 */
  via: "accepted-list" | "arxiv-comment";
  /** 最後に arXiv 照合した日。未発見の論文を毎日照合し直すのに使う。 */
  lastCheckedOn?: string;
}

/** 会議 1 回分の採択論文リスト。`data/venues/{slug}.json`。 */
export interface VenueList {
  /** "focs-2026" */
  slug: string;
  /** "FOCS" */
  venue: string;
  year: number;
  /** "FOCS 2026" */
  name: string;
  /** 採択リストの取得元 URL。arXiv comments だけから作られたリストでは undefined。 */
  sourceUrl?: string;
  /** 採択リスト本文のハッシュ。変化したときだけ再パースする。 */
  sourceHash?: string;
  /** 採択リストを最後に取得した日 (JST)。再取得間隔を空ける会議 (refetchDays) だけが持つ。 */
  sourceCheckedOn?: string;
  /**
   * 関心キーワードで絞り込んで保存しているリスト (NeurIPS など採択数が数千の会議)。
   * `sourceTotal` は絞り込み前の採択リストの件数 (comments 由来のリストでは undefined)。
   */
  gated?: boolean;
  sourceTotal?: number;
  /** このリストを初めて作った日 (JST)。 */
  createdOn: string;
  updatedAt: string;
  papers: VenuePaper[];
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
