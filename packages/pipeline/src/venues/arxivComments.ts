/**
 * arXiv comments 欄の採択表記を判定する。arXiv の co: 検索はトークン一致なので
 * "FOCS ... 2026" が離れて出るだけの comment も返ってくる。ここで隣接出現を確認し、
 * 「投稿中」の表記 ("Submitted to SODA 2027") と、併設ワークショップの論文
 * ("ICML 2026 Workshop on ...", "Workshop at NeurIPS 2026") は本会議の採択ではないので除く。
 *
 * 返り値は採択年 (4 桁)。該当しなければ null。
 */
export function matchVenueComment(
  comment: string | undefined,
  venue: string,
  years: number[],
): number | null {
  if (!comment) return null;
  const v = venue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const yearAlt = years.flatMap((y) => [String(y), `'?${String(y).slice(2)}`]).join("|");
  const m = new RegExp(`\\b${v}[\\s-]*(${yearAlt})\\b`, "i").exec(comment);
  if (!m) return null;
  const notAccepted = new RegExp(
    `(submitted|under review|in submission|under submission)\\s+(to|at)?\\s*(the\\s+)?[^.;]{0,40}\\b${v}\\b`,
    "i",
  );
  if (notAccepted.test(comment)) return null;
  // ワークショップ名は会議名の直後 ("ICML 2026 Workshop") か直前 ("Workshop ... at NeurIPS 2026") に来る
  const around = comment.slice(Math.max(0, m.index - 60), m.index + m[0].length + 30);
  if (/workshop/i.test(around)) return null;
  const y = (m[1] as string).replace("'", "");
  return y.length === 4 ? Number(y) : 2000 + Number(y);
}
