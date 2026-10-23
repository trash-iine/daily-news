import { fetchText } from "../util.js";
import { MIN_TITLE_SIMILARITY, authorsOverlap, titleSimilarity } from "./titles.js";

/**
 * 採択リストのタイトルから OpenAlex 経由で arXiv 版を探す (OPENALEX_API_KEY がある場合のみ。venues/match.ts)。
 *
 * 規約確認 (CLAUDE.md ルール): OpenAlex のデータは CC0。2026 年時点で API はキー制 (無料) で、
 * 検索 1 回 = 10 credits を日次予算から消費する。キー無しの予算は IP 共有で実質使えない。
 * 呼び出しは逐次で、1 日あたり高々数百件。
 */

interface OpenAlexWork {
  title?: string | null;
  ids?: { doi?: string | null };
  locations?: { landing_page_url?: string | null }[];
  authorships?: { author?: { display_name?: string | null } }[];
}

const ARXIV_ABS = /arxiv\.org\/abs\/(\d{4}\.\d{4,5})/i;
const ARXIV_DOI = /10\.48550\/arxiv\.(\d{4}\.\d{4,5})/i;

function arxivIdOf(w: OpenAlexWork): string | null {
  for (const l of w.locations ?? []) {
    const m = ARXIV_ABS.exec(l.landing_page_url ?? "");
    if (m) return m[1] as string;
  }
  const m = ARXIV_DOI.exec(w.ids?.doi ?? "");
  return m ? (m[1] as string) : null;
}

/** 検索結果から、タイトルが十分一致し著者が重なり arXiv 版を持つ最初の work の arXiv ID を返す。 */
export function pickArxivMatch(
  works: OpenAlexWork[],
  title: string,
  authors: string[],
): string | null {
  for (const w of works) {
    if (titleSimilarity(title, w.title ?? "") < MIN_TITLE_SIMILARITY) continue;
    const names = (w.authorships ?? [])
      .map((a) => a.author?.display_name ?? "")
      .filter((n) => n.length > 0);
    if (!authorsOverlap(authors, names)) continue;
    const id = arxivIdOf(w);
    if (id) return id;
  }
  return null;
}

export async function findArxivIdOnOpenAlex(
  title: string,
  authors: string[],
  apiKey: string,
): Promise<string | null> {
  // 検索クエリでは LaTeX 記号がノイズになるので落とす (照合自体は pickArxivMatch が正規化して行う)
  const q = title.replace(/[$\\{}^_]/g, " ").replace(/\s+/g, " ").trim();
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(q)}` +
    `&per_page=5&select=title,ids,locations,authorships`;
  const json = JSON.parse(
    await fetchText(url, { headers: { authorization: `Bearer ${apiKey}` } }),
  ) as { results?: OpenAlexWork[] };
  return pickArxivMatch(json.results ?? [], title, authors);
}
