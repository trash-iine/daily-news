import { PAPERS_TOP_N, PAPER_APS_MIN } from "./config.js";
import type { ArxivPaper } from "./sources/arxiv.js";

export interface ScoredPaper {
  p: ArxivPaper;
  score: number;
  matched: string[];
  priority: boolean;
}

function isAPSSource(source: string): boolean {
  return source.startsWith("aps:");
}

/**
 * sort 済み候補から `PAPERS_TOP_N` 件を選抜する。APS 由来が `PAPER_APS_MIN`
 * 件に満たない場合、未選抜の最上位 APS 論文を最下位の非 APS と入れ替える。
 * 入れ替えはログに出して可視化する。
 */
export function selectFinalists(scored: ScoredPaper[]): ScoredPaper[] {
  const finalists = scored.slice(0, PAPERS_TOP_N);
  const apsInFinal = finalists.filter((s) => isAPSSource(s.p.source)).length;
  if (apsInFinal >= PAPER_APS_MIN) return finalists;

  const remainingAps = scored
    .slice(PAPERS_TOP_N)
    .filter((s) => isAPSSource(s.p.source));
  let need = PAPER_APS_MIN - apsInFinal;
  for (const aps of remainingAps) {
    if (need <= 0) break;
    let swapIdx = -1;
    for (let i = finalists.length - 1; i >= 0; i--) {
      const candidate = finalists[i];
      if (candidate && !isAPSSource(candidate.p.source)) {
        swapIdx = i;
        break;
      }
    }
    if (swapIdx === -1) break;
    const removed = finalists[swapIdx];
    if (!removed) break;
    finalists[swapIdx] = aps;
    console.log(
      `[main] enforced APS minimum: swapped in "${aps.p.title}" (replaced "${removed.p.title}")`,
    );
    need--;
  }
  return finalists;
}
