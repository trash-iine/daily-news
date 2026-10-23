import { VENUE_MATCH_MAX_PER_RUN_ARXIV, VENUE_MATCH_MAX_PER_RUN_OPENALEX } from "../config.js";
import { searchArxivByTitleWords, type ArxivPaper } from "../sources/arxiv.js";
import { findArxivIdOnOpenAlex } from "./openAlex.js";
import { MIN_TITLE_SIMILARITY, authorsOverlap, titleSimilarity, titleTokens } from "./titles.js";

export interface MatchResult {
  arxivId: string;
  /** arXiv 検索で見つけた場合はメタも取れているので、id_list の再取得を省ける。 */
  paper?: ArxivPaper;
}

/** 採択リストのタイトルから arXiv 版を探す手段。実行ごとの件数上限と呼び出し間隔を持つ。 */
export interface ArxivMatcher {
  name: string;
  maxPerRun: number;
  intervalMs: number;
  find(title: string, authors: string[]): Promise<MatchResult | null>;
}

const stripVersion = (id: string) => id.replace(/v\d+$/, "");

/** arXiv の検索結果から、タイトルが十分一致し著者が重なる論文を選ぶ。 */
export function pickArxivPaper(
  papers: ArxivPaper[],
  title: string,
  authors: string[],
): ArxivPaper | null {
  return (
    papers.find(
      (p) => titleSimilarity(title, p.title) >= MIN_TITLE_SIMILARITY && authorsOverlap(authors, p.authors),
    ) ?? null
  );
}

/** 検索語。短い語 (冠詞・前置詞) を落とし、先頭から最大 6 語。 */
export function titleSearchWords(title: string): string[] {
  const tokens = titleTokens(title);
  const long = tokens.filter((t) => t.length > 3);
  return (long.length >= 2 ? long : tokens).slice(0, 6);
}

/**
 * 既定の照合手段。arXiv API のタイトル語検索 (キー不要)。ToU に従い 3 秒間隔で逐次に呼ぶので、
 * 1 回の実行で照合できる件数は少ない (採択リスト公開日の一括照合は数日に分かれる)。
 */
export const arxivTitleMatcher: ArxivMatcher = {
  name: "arxiv",
  maxPerRun: VENUE_MATCH_MAX_PER_RUN_ARXIV,
  intervalMs: 3000,
  async find(title, authors) {
    const p = pickArxivPaper(await searchArxivByTitleWords(titleSearchWords(title)), title, authors);
    return p ? { arxivId: stripVersion(p.arxivId), paper: p } : null;
  },
};

function openAlexMatcher(apiKey: string): ArxivMatcher {
  return {
    name: "openalex",
    maxPerRun: VENUE_MATCH_MAX_PER_RUN_OPENALEX,
    intervalMs: 150,
    async find(title, authors) {
      const id = await findArxivIdOnOpenAlex(title, authors, apiKey);
      return id ? { arxivId: id } : null;
    },
  };
}

/**
 * `OPENALEX_API_KEY` (無料、GitHub Secrets) があれば OpenAlex を使う。速く件数上限も大きい。
 * 無ければ arXiv API。OpenAlex はキー無しだと IP 共有の小さな日次枠しか無く、
 * Actions のランナーでは枯渇しているのが常態なので使わない。
 */
export function pickMatcher(): ArxivMatcher {
  const key = process.env.OPENALEX_API_KEY;
  return key ? openAlexMatcher(key) : arxivTitleMatcher;
}
