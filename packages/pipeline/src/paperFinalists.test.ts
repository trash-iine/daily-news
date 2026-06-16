import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  isQuantumPaper,
  selectFinalists,
  type ScoredPaper,
} from "./paperFinalists.js";
import type { ArxivPaper } from "./sources/arxiv.js";

// PAPERS_TOP_N は 5。テストもこの前提で書く。

function mkPaper(
  source: string,
  idx: number,
  opts?: { quantum?: boolean },
): ArxivPaper {
  return {
    arxivId: `${source}-${idx}`,
    title: `${source} paper ${idx}`,
    abstract: opts?.quantum ? "quantum computing experiment with qubits" : "abstract",
    authors: [],
    absUrl: `https://example.com/${source}/${idx}`,
    pdfUrl: `https://example.com/${source}/${idx}.pdf`,
    source,
    announceType: "new",
    publishedAt: "2026-05-15T00:00:00.000Z",
  };
}

function mkScored(
  source: string,
  idx: number,
  score: number,
  opts?: { quantum?: boolean },
): ScoredPaper {
  return {
    p: mkPaper(source, idx, opts),
    score,
    matched: [],
    priority: false,
  };
}

describe("selectFinalists", () => {
  it("上位 PAPERS_TOP_N (5) 件で打ち切り、sort 順を尊重する", () => {
    const scored: ScoredPaper[] = Array.from({ length: 8 }, (_, i) =>
      mkScored("arxiv:cs.LG", i, 100 - i),
    );
    const out = selectFinalists(scored, []);
    assert.equal(out.length, 5);
    assert.equal(out[0]?.p.arxivId, "arxiv:cs.LG-0");
    assert.equal(out[4]?.p.arxivId, "arxiv:cs.LG-4");
  });

  it("APS は最低保証されず、スコア競争で落ちる", () => {
    // 上位 5 件すべて arXiv、6 番目に低スコア APS → APS は採用されない
    const scored: ScoredPaper[] = [
      ...Array.from({ length: 5 }, (_, i) => mkScored("arxiv:cs.LG", i, 100 - i)),
      mkScored("aps:prxquantum", 1, 5),
    ];
    const out = selectFinalists(scored, []);
    assert.equal(out.length, 5);
    const apsCount = out.filter((s) => s.p.source.startsWith("aps:")).length;
    assert.equal(apsCount, 0, "APS 最低保証は撤廃されているので入らない");
  });

  it("候補が PAPERS_TOP_N 未満でも壊れない", () => {
    const scored: ScoredPaper[] = [
      mkScored("arxiv:cs.LG", 1, 50),
      mkScored("arxiv:cs.DS", 1, 40),
    ];
    const out = selectFinalists(scored, []);
    assert.equal(out.length, 2);
  });

  it("finalists に quantum が無く quantumPool に候補があれば、最下位と入れ替えて最低 1 本確保する", () => {
    const scored: ScoredPaper[] = Array.from({ length: 5 }, (_, i) =>
      mkScored("arxiv:cs.LG", i, 100 - i),
    );
    const quantumPool: ScoredPaper[] = [
      mkScored("arxiv:quant-ph", 1, 0, { quantum: true }),
    ];
    const out = selectFinalists(scored, quantumPool);
    assert.equal(out.length, 5);
    const qCount = out.filter((s) => isQuantumPaper(s.p)).length;
    assert.equal(qCount, 1, "quantum が最低 1 本確保されること");
    // 最下位 (score 96) が quantum に置き換わる
    assert.equal(out[4]?.p.source, "arxiv:quant-ph");
    // top 4 は不変
    for (let i = 0; i < 4; i++) {
      assert.equal(out[i]?.p.source, "arxiv:cs.LG");
    }
  });

  it("APS が最下位なら保護されず quantum 補充で入れ替えられる", () => {
    // 最下位に非 quantum APS。APS 保護は無いので swap 対象になる。
    const scored: ScoredPaper[] = [
      ...Array.from({ length: 4 }, (_, i) => mkScored("arxiv:cs.LG", i, 100 - i)),
      mkScored("aps:prl", 1, 50),
    ];
    const quantumPool: ScoredPaper[] = [
      mkScored("arxiv:quant-ph", 1, 0, { quantum: true }),
    ];
    const out = selectFinalists(scored, quantumPool);
    assert.equal(out.length, 5);
    assert.equal(out[4]?.p.source, "arxiv:quant-ph", "最下位 APS が quantum に置換される");
  });

  it("finalists に既に quantum があれば補充しない", () => {
    const scored: ScoredPaper[] = [
      mkScored("arxiv:quant-ph", 0, 100, { quantum: true }),
      ...Array.from({ length: 4 }, (_, i) => mkScored("arxiv:cs.LG", i, 90 - i)),
    ];
    const quantumPool: ScoredPaper[] = [
      mkScored("arxiv:quant-ph", 0, 100, { quantum: true }),
      mkScored("arxiv:quant-ph", 99, 0, { quantum: true }),
    ];
    const out = selectFinalists(scored, quantumPool);
    assert.equal(out.length, 5);
    const qCount = out.filter((s) => isQuantumPaper(s.p)).length;
    assert.equal(qCount, 1, "既存 quantum 1 本で充足し追加されないこと");
    assert.equal(out[0]?.p.source, "arxiv:quant-ph");
    assert.equal(out[4]?.p.source, "arxiv:cs.LG");
  });

  it("quantumPool が空なら何もしない (壊れない)", () => {
    const scored: ScoredPaper[] = Array.from({ length: 5 }, (_, i) =>
      mkScored("arxiv:cs.LG", i, 100 - i),
    );
    const out = selectFinalists(scored, []);
    assert.equal(out.length, 5);
    const qCount = out.filter((s) => isQuantumPaper(s.p)).length;
    assert.equal(qCount, 0, "候補が無ければ floor を満たせないまま終了");
  });

  it("finalists が TOP_N 未満なら quantum は swap でなく push される", () => {
    const scored: ScoredPaper[] = Array.from({ length: 3 }, (_, i) =>
      mkScored("arxiv:cs.LG", i, 100 - i),
    );
    const quantumPool: ScoredPaper[] = [
      mkScored("arxiv:quant-ph", 1, 0, { quantum: true }),
    ];
    const out = selectFinalists(scored, quantumPool);
    assert.equal(out.length, 4, "swap せず push されて 4 件になること");
    const qCount = out.filter((s) => isQuantumPaper(s.p)).length;
    assert.equal(qCount, 1);
    for (let i = 0; i < 3; i++) {
      assert.equal(out[i]?.p.source, "arxiv:cs.LG");
    }
    assert.equal(out[3]?.p.source, "arxiv:quant-ph");
  });
});
