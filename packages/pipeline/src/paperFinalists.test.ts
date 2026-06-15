import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  isQuantumPaper,
  selectFinalists,
  type ScoredPaper,
} from "./paperFinalists.js";
import type { ArxivPaper } from "./sources/arxiv.js";

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
  it("APS が既に top-N に含まれていれば入れ替えは起きない", () => {
    const scored: ScoredPaper[] = [
      mkScored("arxiv:cs.DS", 1, 100),
      mkScored("aps:prxquantum", 1, 90),
      ...Array.from({ length: 8 }, (_, i) => mkScored("arxiv:cs.LG", i, 80 - i)),
      mkScored("arxiv:cs.LG", 99, 1), // 11 番目、落ちる
    ];
    const out = selectFinalists(scored, []);
    assert.equal(out.length, 10);
    const apsCount = out.filter((s) => s.p.source.startsWith("aps:")).length;
    assert.equal(apsCount, 1);
    // 元の sort 順を尊重
    assert.equal(out[0]?.p.source, "arxiv:cs.DS");
    assert.equal(out[1]?.p.source, "aps:prxquantum");
  });

  it("top-N に APS が無く、未選抜に APS があれば最下位の非 APS と入れ替える", () => {
    // top 10 すべて arXiv、11 番目に低スコア APS
    const scored: ScoredPaper[] = [
      ...Array.from({ length: 10 }, (_, i) => mkScored("arxiv:cs.LG", i, 100 - i)),
      mkScored("aps:prxquantum", 1, 5),
    ];
    const out = selectFinalists(scored, []);
    assert.equal(out.length, 10);
    const apsCount = out.filter((s) => s.p.source.startsWith("aps:")).length;
    assert.equal(apsCount, 1, "APS が 1 件確保されるべき");
    // 最下位 (arxiv idx=9, score=91) が APS に置き換わる
    assert.equal(out[9]?.p.source, "aps:prxquantum");
    // top 9 は変わらない
    for (let i = 0; i < 9; i++) {
      assert.equal(out[i]?.p.source, "arxiv:cs.LG");
    }
  });

  it("APS が未選抜にも無ければ何もしない (空 swap)", () => {
    const scored: ScoredPaper[] = Array.from({ length: 12 }, (_, i) =>
      mkScored("arxiv:cs.LG", i, 100 - i),
    );
    const out = selectFinalists(scored, []);
    assert.equal(out.length, 10);
    const apsCount = out.filter((s) => s.p.source.startsWith("aps:")).length;
    assert.equal(apsCount, 0);
  });

  it("候補が PAPERS_TOP_N 未満でも壊れない", () => {
    const scored: ScoredPaper[] = [
      mkScored("arxiv:cs.LG", 1, 50),
      mkScored("aps:prxquantum", 1, 40),
    ];
    const out = selectFinalists(scored, []);
    assert.equal(out.length, 2);
  });

  it("finalists に quantum が無く quantumPool に候補があれば、最下位の非 APS と入れ替えて最低 1 本確保する", () => {
    // top 10 すべて non-quantum、quantumPool に閾値落ちの quantum 1 件
    const scored: ScoredPaper[] = Array.from({ length: 10 }, (_, i) =>
      mkScored("arxiv:cs.LG", i, 100 - i),
    );
    const quantumPool: ScoredPaper[] = [
      mkScored("arxiv:quant-ph", 1, 0, { quantum: true }),
    ];
    const out = selectFinalists(scored, quantumPool);
    assert.equal(out.length, 10);
    const qCount = out.filter((s) => isQuantumPaper(s.p)).length;
    assert.equal(qCount, 1, "quantum が最低 1 本確保されること");
    // 最下位 (score 91) が quantum に置き換わる
    assert.equal(out[9]?.p.source, "arxiv:quant-ph");
    // top 9 は不変
    for (let i = 0; i < 9; i++) {
      assert.equal(out[i]?.p.source, "arxiv:cs.LG");
    }
  });

  it("finalists に既に quantum があれば補充しない", () => {
    const scored: ScoredPaper[] = [
      mkScored("arxiv:quant-ph", 0, 100, { quantum: true }),
      ...Array.from({ length: 9 }, (_, i) => mkScored("arxiv:cs.LG", i, 90 - i)),
    ];
    const quantumPool: ScoredPaper[] = [
      mkScored("arxiv:quant-ph", 0, 100, { quantum: true }),
      mkScored("arxiv:quant-ph", 99, 0, { quantum: true }),
    ];
    const out = selectFinalists(scored, quantumPool);
    assert.equal(out.length, 10);
    const qCount = out.filter((s) => isQuantumPaper(s.p)).length;
    assert.equal(qCount, 1, "既存 quantum 1 本で充足し追加されないこと");
    // 元の構成を維持
    assert.equal(out[0]?.p.source, "arxiv:quant-ph");
    assert.equal(out[9]?.p.source, "arxiv:cs.LG");
  });

  it("APS 最小保証で入った prxquantum は quantum としてカウントされ追加補充されない", () => {
    // top 10 すべて非 APS non-quantum、未選抜に APS quantum (prxquantum)
    const scored: ScoredPaper[] = [
      ...Array.from({ length: 10 }, (_, i) => mkScored("arxiv:cs.LG", i, 100 - i)),
      mkScored("aps:prxquantum", 1, 5, { quantum: true }),
    ];
    const quantumPool: ScoredPaper[] = [
      mkScored("aps:prxquantum", 1, 5, { quantum: true }),
      mkScored("arxiv:quant-ph", 99, 0, { quantum: true }),
    ];
    const out = selectFinalists(scored, quantumPool);
    assert.equal(out.length, 10);
    const apsCount = out.filter((s) => s.p.source.startsWith("aps:")).length;
    assert.equal(apsCount, 1, "APS 最小保証で prxquantum が入ること");
    const qCount = out.filter((s) => isQuantumPaper(s.p)).length;
    assert.equal(qCount, 1, "prxquantum が quantum を兼ね、追加補充されないこと");
  });

  it("quantumPool が空なら何もしない (壊れない)", () => {
    const scored: ScoredPaper[] = Array.from({ length: 10 }, (_, i) =>
      mkScored("arxiv:cs.LG", i, 100 - i),
    );
    const out = selectFinalists(scored, []);
    assert.equal(out.length, 10);
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
    // 既存 3 件は不変
    for (let i = 0; i < 3; i++) {
      assert.equal(out[i]?.p.source, "arxiv:cs.LG");
    }
    assert.equal(out[3]?.p.source, "arxiv:quant-ph");
  });
});
