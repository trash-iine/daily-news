import {
  PAPERS_TOP_N,
  PAPER_APS_MIN,
  PAPERS_QUANTUM_MIN,
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

/**
 * quantum 系論文か判定する。quantum は重みづけ対象外でキーワードに依らず
 * スコア 0 になりうるため、source カテゴリ (quant-ph / prxquantum) も併用して
 * 確実に拾えるようにする。
 */
export function isQuantumPaper(p: ArxivPaper): boolean {
  if (p.source === "arxiv:quant-ph" || p.source === "aps:prxquantum") return true;
  const hay = `${p.title} ${p.abstract}`.toLowerCase();
  return PAPER_QUANTUM_KEYWORDS.some((k) => hay.includes(k));
}

/**
 * finalists 内の quantum 件数が `PAPERS_QUANTUM_MIN` に満たない場合、
 * `quantumPool` (閾値前を含む quantum 候補をスコア順ソート済み) から finalists
 * 未収録の論文を補充して floor を満たす。
 * finalists が `PAPERS_TOP_N` 未満なら末尾に push、満杯なら最下位の非 APS
 * finalist と入れ替える (APS 最小保証を壊さない)。候補が枯渇したら満たせない
 * まま終了する (ログのみ)。
 */
function enforceQuantumMin(
  finalists: ScoredPaper[],
  quantumPool: ScoredPaper[],
): void {
  let qCount = finalists.filter((s) => isQuantumPaper(s.p)).length;
  if (qCount >= PAPERS_QUANTUM_MIN) return;

  const inFinal = new Set(finalists.map((s) => s.p.absUrl));
  const candidates = quantumPool.filter((s) => !inFinal.has(s.p.absUrl));

  for (const cand of candidates) {
    if (qCount >= PAPERS_QUANTUM_MIN) break;
    if (finalists.length < PAPERS_TOP_N) {
      finalists.push(cand);
      qCount++;
      console.log(
        `[main] enforced quantum minimum (${PAPERS_QUANTUM_MIN}): appended "${cand.p.title}"`,
      );
      continue;
    }
    let swapIdx = -1;
    for (let i = finalists.length - 1; i >= 0; i--) {
      const f = finalists[i];
      if (f && !isAPSSource(f.p.source) && !isQuantumPaper(f.p)) {
        swapIdx = i;
        break;
      }
    }
    if (swapIdx === -1) break;
    const removed = finalists[swapIdx];
    if (!removed) break;
    finalists[swapIdx] = cand;
    qCount++;
    console.log(
      `[main] enforced quantum minimum (${PAPERS_QUANTUM_MIN}): swapped in "${cand.p.title}" (replaced "${removed.p.title}")`,
    );
  }
}

/**
 * sort 済み候補から `PAPERS_TOP_N` 件を選抜する。
 * (1) APS 由来が `PAPER_APS_MIN` 件に満たない場合、未選抜の最上位 APS 論文を
 *     最下位の非 APS と入れ替えて APS 最小保証を満たす。
 * (2) その後、quantum が `PAPERS_QUANTUM_MIN` 件に満たない場合、`quantumPool`
 *     (閾値前を含む quantum 候補) から `enforceQuantumMin` で補充する。
 *     APS 最小保証で prxquantum が入った場合は (2) で充足扱いになる。
 * 入れ替えはログに出して可視化する。
 */
export function selectFinalists(
  scored: ScoredPaper[],
  quantumPool: ScoredPaper[],
): ScoredPaper[] {
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

  enforceQuantumMin(finalists, quantumPool);
  return finalists;
}
