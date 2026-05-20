import {
  PAPERS_TOP_N,
  PAPER_APS_MIN,
  PAPERS_QUANTUM_MAX,
  PAPER_QUANTUM_KEYWORDS,
} from "./config.js";
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

function isQuantumPaper(s: ScoredPaper): boolean {
  const hay = `${s.p.title} ${s.p.abstract}`.toLowerCase();
  return PAPER_QUANTUM_KEYWORDS.some((k) => hay.includes(k));
}

/**
 * quantum 系論文が `PAPERS_QUANTUM_MAX` を超えていれば、最下位の非 APS
 * quantum を未選抜の非 quantum 論文と入れ替えて偏りを緩和する。
 * APS quantum (prxquantum 等) は APS 最小保証を尊重するため swap 対象から外す。
 * 候補が枯渇したら上限を満たせないまま終了する (ログのみ)。
 */
function enforceQuantumCap(
  finalists: ScoredPaper[],
  scored: ScoredPaper[],
): void {
  const isQ = finalists.map(isQuantumPaper);
  let qCount = isQ.filter(Boolean).length;
  if (qCount <= PAPERS_QUANTUM_MAX) return;

  const replacements = scored
    .slice(PAPERS_TOP_N)
    .filter((s) => !isQuantumPaper(s));

  for (const repl of replacements) {
    if (qCount <= PAPERS_QUANTUM_MAX) break;
    let swapIdx = -1;
    for (let i = finalists.length - 1; i >= 0; i--) {
      const candidate = finalists[i];
      if (candidate && isQ[i] && !isAPSSource(candidate.p.source)) {
        swapIdx = i;
        break;
      }
    }
    if (swapIdx === -1) break;
    const removed = finalists[swapIdx];
    if (!removed) break;
    finalists[swapIdx] = repl;
    isQ[swapIdx] = false;
    qCount--;
    console.log(
      `[main] enforced quantum cap (${PAPERS_QUANTUM_MAX}): swapped in "${repl.p.title}" (replaced "${removed.p.title}")`,
    );
  }
}

/**
 * sort 済み候補から `PAPERS_TOP_N` 件を選抜する。
 * (1) APS 由来が `PAPER_APS_MIN` 件に満たない場合、未選抜の最上位 APS 論文を
 *     最下位の非 APS と入れ替えて APS 最小保証を満たす。
 * (2) その後、quantum 比率が `PAPERS_QUANTUM_MAX` を超えていれば
 *     `enforceQuantumCap` で非 quantum 論文と入れ替える。
 * 入れ替えはログに出して可視化する。
 */
export function selectFinalists(scored: ScoredPaper[]): ScoredPaper[] {
  const finalists = scored.slice(0, PAPERS_TOP_N);
  const apsInFinal = finalists.filter((s) => isAPSSource(s.p.source)).length;
  if (apsInFinal < PAPER_APS_MIN) {
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
  }

  enforceQuantumCap(finalists, scored);
  return finalists;
}
