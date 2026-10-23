import { PAPER_KEYWORDS, PAPER_QUANTUM_KEYWORDS, VENUE_GATE_MIN_WEIGHT } from "../config.js";
import { isQuantumPaper } from "../paperFinalists.js";
import { paperRelevance } from "../ranking.js";

/**
 * 採択数が数千の会議 (gated) から保存する論文の条件。タイトルが PAPER_KEYWORDS の重み
 * VENUE_GATE_MIN_WEIGHT 以上の語に一致するか、量子の論文であること
 * (quantum は重みづけしない方針で PAPER_KEYWORDS に無いので別に見る)。
 *
 * タイトルだけで見る: 採択リストにはタイトルしか無く、abstract まで見ると ML 論文の
 * "heuristic" のような一般的な用法 (幻覚検出・対話エージェント等) まで通ってしまう。
 */
export function passesVenueGate(title: string): boolean {
  const { matched } = paperRelevance(title, "");
  if (matched.some((k) => (PAPER_KEYWORDS[k] ?? 0) >= VENUE_GATE_MIN_WEIGHT)) return true;
  return isQuantumPaper({ source: "", title, abstract: "" });
}

/** gated な会議の comments 検索に AND するタイトルの語 (passesVenueGate と同じ語彙)。 */
export function venueGateTerms(): string[] {
  return [
    ...Object.entries(PAPER_KEYWORDS)
      .filter(([, w]) => w >= VENUE_GATE_MIN_WEIGHT)
      .map(([k]) => k),
    ...PAPER_QUANTUM_KEYWORDS,
  ];
}
