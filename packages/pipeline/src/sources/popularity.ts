/**
 * HN の points を baseScore に折り込む。sub-linear sqrt スケール cap 15。
 *   10pt -> 6, 50pt -> 14, 100pt+ -> 15
 * lookback を 7 日に伸ばした分、高 points のロングテールを浮かせるため
 * 上限を 15 まで広げる (Qiita LGTM / Zenn いいねの上限と揃える)。
 */
export function pointsToBaseScore(points: number | null | undefined): number {
  if (!points || points <= 0) return 0;
  return Math.min(15, Math.round(2 * Math.sqrt(points)));
}

/**
 * JSON.parse の失敗時にソース ID + 先頭 200 文字の body プレビューを添えて
 * 投げ直す。呼び出し側 (safeFeed) でこの Error が health.log に
 * `error: "..."` フィールドとして残り、どの source がどんな bad payload を
 * 返したか追跡できるようになる。
 */
export function parseJsonOr<T>(body: string, sourceId: string): T {
  try {
    return JSON.parse(body) as T;
  } catch (err) {
    const preview = body.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(
      `${sourceId}: invalid JSON (${(err as Error).message}) — body[:200]=${preview}`,
    );
  }
}
