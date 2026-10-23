import { searchArxivByTitleWords, type ArxivPaper } from "../sources/arxiv.js";
import { samePaper, titleTokens } from "./titles.js";

/** arXiv の検索結果から、同じ論文 (titles.ts: samePaper) を選ぶ。 */
export function pickArxivPaper(
  papers: ArxivPaper[],
  title: string,
  authors: string[],
): ArxivPaper | null {
  return papers.find((p) => samePaper({ title, authors }, p)) ?? null;
}

/** 検索語。短い語 (冠詞・前置詞) を落とし、先頭から最大 6 語。 */
export function titleSearchWords(title: string): string[] {
  const tokens = titleTokens(title);
  const long = tokens.filter((t) => t.length > 3);
  return (long.length >= 2 ? long : tokens).slice(0, 6);
}

/**
 * 採択リストの 1 本の arXiv 版を、arXiv API のタイトル語検索 (キー不要) で探す。
 * ToU に従い呼び出し側 (venues/index.ts) が 3 秒間隔で逐次に呼ぶので、1 回の実行で照合できる
 * 件数は少ない (採択リスト公開日の一括照合は数日に分かれる)。
 *
 * 他の照合先は使わない: OpenAlex は 2026 年からキー制 (キー無しは IP 共有の日次枠で枯渇)、
 * DBLP / Semantic Scholar はキー無しだと 429 が続く。
 */
export async function findOnArxiv(title: string, authors: string[]): Promise<ArxivPaper | null> {
  return pickArxivPaper(await searchArxivByTitleWords(titleSearchWords(title)), title, authors);
}
