export interface ScoreResult {
  score: number;
  matched: string[];
}

const ASCII_ONLY = /^[\x00-\x7F]+$/;
const REGEX_META = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(s: string): string {
  return s.replace(REGEX_META, "\\$&");
}

/**
 * 与えたキーワード集合に対する text 中の出現回数を計算する。
 * - ASCII のみのキーワードは単語境界 (\b) で区切ってマッチさせ、
 *   "rust" が "trustworthy" に当たるような誤一致を避ける。
 * - 日本語などマルチバイト文字を含むキーワードは部分一致 (Unicode 単語境界が
 *   実用的に機能しないため)。
 */
function countOccurrences(haystackLower: string, keyword: string): number {
  const k = keyword.toLowerCase();
  if (k.length === 0) return 0;
  if (ASCII_ONLY.test(k)) {
    const re = new RegExp(`\\b${escapeRegex(k)}\\b`, "g");
    return (haystackLower.match(re) ?? []).length;
  }
  let count = 0;
  let from = 0;
  while (true) {
    const idx = haystackLower.indexOf(k, from);
    if (idx === -1) break;
    count++;
    from = idx + k.length;
  }
  return count;
}

/**
 * フィールド (title / body) に分けてスコアリングする。
 * - 各キーワードの加点は (titleHits * TITLE_BOOST + bodyHits) * weight だが、
 *   同一語の連投でスコアが暴走しないよう、加算後に weight * CAP_MULTIPLIER で頭打ちする。
 * - matched にはヒットしたキーワードを 1 度ずつ追加する。
 */
const TITLE_BOOST = 2;
const CAP_MULTIPLIER = 3;

export function scoreFields(
  title: string,
  body: string,
  weights: Record<string, number>,
): ScoreResult {
  const titleLower = title.toLowerCase();
  const bodyLower = body.toLowerCase();
  const matched: string[] = [];
  let score = 0;
  for (const [keyword, weight] of Object.entries(weights)) {
    const titleHits = countOccurrences(titleLower, keyword);
    const bodyHits = countOccurrences(bodyLower, keyword);
    const totalHits = titleHits * TITLE_BOOST + bodyHits;
    if (totalHits === 0) continue;
    const cap = weight * CAP_MULTIPLIER;
    const add = Math.min(totalHits * weight, cap);
    score += add;
    matched.push(keyword.toLowerCase());
  }
  return { score, matched };
}

/**
 * いずれかのネガティブキーワードに一致したら true。
 * ASCII / 非 ASCII の両方を扱える。
 */
export function hasNegativeKeyword(
  title: string,
  body: string,
  negatives: readonly string[],
): boolean {
  if (negatives.length === 0) return false;
  const titleLower = title.toLowerCase();
  const bodyLower = body.toLowerCase();
  for (const n of negatives) {
    if (countOccurrences(titleLower, n) > 0) return true;
    if (countOccurrences(bodyLower, n) > 0) return true;
  }
  return false;
}

