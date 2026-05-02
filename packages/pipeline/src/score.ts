export interface ScoreResult {
  score: number;
  matched: string[];
}

export function scoreText(
  text: string,
  weights: Record<string, number>,
): ScoreResult {
  const haystack = text.toLowerCase();
  const matched: string[] = [];
  let score = 0;
  for (const [keyword, weight] of Object.entries(weights)) {
    if (haystack.includes(keyword.toLowerCase())) {
      score += weight;
      matched.push(keyword.toLowerCase());
    }
  }
  return { score, matched };
}
