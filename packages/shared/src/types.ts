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
}

export interface DailyBundle {
  date: string;
  generatedAt: string;
  items: BaseItem[];
}

export interface DailyIndex {
  dates: string[];
  updatedAt: string;
}
