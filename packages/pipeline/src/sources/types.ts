export interface RawItem {
  title: string;
  url: string;
  description: string;
  source: string;
  publishedAt: string;
  baseScore?: number;
  /**
   * trending スナップショット (qiitaTrending / zennTrending / hnTrending) で記事側の
   * tags / topics をそのまま運ぶための optional フィールド。news ランキングパスでは未使用。
   * canonical 化は呼び出し側 (main の collectTrending) で行う。
   */
  rawTags?: string[];
}
