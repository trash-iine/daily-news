/**
 * 採択リストのタイトル・著者と、arXiv / OpenAlex 側の表記を突き合わせるための正規化。
 * 採択リストは LaTeX ($\tilde{O}(1)$) やタイポグラフィ記号 (’ –) を含み、OpenAlex は
 * それを Unicode で持つので、記号は落として英数字トークンの集合で比べる。
 */

/** 小文字化 + LaTeX の数式部分・記号を除去した英数字トークン列。 */
export function titleTokens(title: string): string[] {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\$[^$]*\$/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 0);
}

/** 照合キー。同一論文の表記揺れを吸収して Map のキーにする。 */
export function titleKey(title: string): string {
  return titleTokens(title).join(" ");
}

/** 同一論文とみなすタイトル類似度 (Jaccard) の下限。LaTeX 記号の表記揺れで 1.0 にならない分の余裕。 */
export const MIN_TITLE_SIMILARITY = 0.75;

/**
 * 著者が分からない採択リスト (ML 会議の一覧ページはタイトルだけ) を照合するときの下限。
 * 著者の重なりで誤照合を防げない分、タイトルはほぼ一致を要求する。
 */
export const MIN_TITLE_SIMILARITY_NO_AUTHORS = 0.9;

/** トークン集合の Jaccard 係数。 */
export function titleSimilarity(a: string, b: string): number {
  const sa = new Set(titleTokens(a));
  const sb = new Set(titleTokens(b));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/**
 * 採択リストの著者行を名前の配列にする。所属の括弧書きを落としてから区切る。
 * 例: "Édouard Bonnet (CNRS); Tuukka Korhonen, Hung Le (Copenhagen)" → 3 名
 */
export function splitAuthorsLine(line: string): string[] {
  let s = line;
  // 所属の中にさらに括弧が入ることがあるので、内側から剥がす
  for (let i = 0; i < 3; i++) s = s.replace(/\([^()]*\)/g, " ");
  return s
    .replace(/\s+and\s+/gi, ",")
    .split(/[,;]/)
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter((x) => x.length > 0 && /\p{L}/u.test(x));
}

function surname(name: string): string {
  const tokens = titleTokens(name);
  return tokens[tokens.length - 1] ?? "";
}

/** 2 つの著者リストで姓が 1 人以上一致するか。タイトル一致だけの誤照合を防ぐ。 */
export function authorsOverlap(a: string[], b: string[]): boolean {
  const sa = new Set(a.map(surname).filter((s) => s.length > 1));
  return b.some((n) => sa.has(surname(n)));
}

/**
 * 採択リストの 1 本と照合先の 1 件が同じ論文か。著者が分かっていればタイトル類似 + 著者の重なり、
 * 分からなければタイトルのほぼ一致で判定する。
 */
export function samePaper(
  q: { title: string; authors: string[] },
  c: { title: string; authors: string[] },
): boolean {
  const sim = titleSimilarity(q.title, c.title);
  if (q.authors.length === 0) return sim >= MIN_TITLE_SIMILARITY_NO_AUTHORS;
  return sim >= MIN_TITLE_SIMILARITY && authorsOverlap(q.authors, c.authors);
}
