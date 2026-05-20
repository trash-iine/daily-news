import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { selectFinalists, type ScoredPaper } from "./paperFinalists.js";
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
    const out = selectFinalists(scored);
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
    const out = selectFinalists(scored);
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
    const out = selectFinalists(scored);
    assert.equal(out.length, 10);
    const apsCount = out.filter((s) => s.p.source.startsWith("aps:")).length;
    assert.equal(apsCount, 0);
  });

  it("候補が PAPERS_TOP_N 未満でも壊れない", () => {
    const scored: ScoredPaper[] = [
      mkScored("arxiv:cs.LG", 1, 50),
      mkScored("aps:prxquantum", 1, 40),
    ];
    const out = selectFinalists(scored);
    assert.equal(out.length, 2);
  });

  it("quantum 論文が PAPERS_QUANTUM_MAX 以下なら入れ替えは起きない", () => {
    const scored: ScoredPaper[] = [
      ...Array.from({ length: 4 }, (_, i) =>
        mkScored("arxiv:quant-ph", i, 100 - i, { quantum: true }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        mkScored("arxiv:cs.LG", i, 50 - i),
      ),
      mkScored("arxiv:cs.LG", 99, 1),
    ];
    const out = selectFinalists(scored);
    assert.equal(out.length, 10);
    const qCount = out.filter((s) =>
      `${s.p.title} ${s.p.abstract}`.toLowerCase().includes("quantum computing"),
    ).length;
    assert.equal(qCount, 4);
    // 元の sort 順を尊重
    assert.equal(out[0]?.p.source, "arxiv:quant-ph");
    assert.equal(out[9]?.p.source, "arxiv:cs.LG");
  });

  it("quantum が上限超過のとき、最下位の非 APS quantum が未選抜 non-quantum と入れ替わる", () => {
    // top 10 のうち 7 件が quantum (idx 0-6, scores 100-94)、3 件が non-quantum (scores 93-91)
    // 未選抜に non-quantum が 3 件 (scores 90, 89, 88)
    const scored: ScoredPaper[] = [
      ...Array.from({ length: 7 }, (_, i) =>
        mkScored("arxiv:quant-ph", i, 100 - i, { quantum: true }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        mkScored("arxiv:cs.LG", i, 93 - i),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        mkScored("arxiv:cs.LG", 10 + i, 90 - i),
      ),
    ];
    const out = selectFinalists(scored);
    assert.equal(out.length, 10);
    const qCount = out.filter((s) =>
      `${s.p.title} ${s.p.abstract}`.toLowerCase().includes("quantum computing"),
    ).length;
    assert.equal(qCount, 4, "quantum 件数が PAPERS_QUANTUM_MAX(=4) まで減ること");
    // top4 (quantum) は不変
    for (let i = 0; i < 4; i++) {
      assert.equal(out[i]?.p.source, "arxiv:quant-ph");
    }
    // 未選抜 3 件が swap-in されている
    const titles = out.map((s) => s.p.title);
    assert.ok(titles.includes("arxiv:cs.LG paper 10"));
    assert.ok(titles.includes("arxiv:cs.LG paper 11"));
    assert.ok(titles.includes("arxiv:cs.LG paper 12"));
  });

  it("未選抜に non-quantum が足りないときは可能な範囲で swap、残りは quantum のまま", () => {
    // top 10 すべて quantum、未選抜に non-quantum が 1 件のみ
    const scored: ScoredPaper[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        mkScored("arxiv:quant-ph", i, 100 - i, { quantum: true }),
      ),
      mkScored("arxiv:cs.LG", 99, 5),
    ];
    const out = selectFinalists(scored);
    assert.equal(out.length, 10);
    const qCount = out.filter((s) =>
      `${s.p.title} ${s.p.abstract}`.toLowerCase().includes("quantum computing"),
    ).length;
    // 1 件だけ swap できたので quantum は 9 件 (cap 4 を満たせないが許容)
    assert.equal(qCount, 9);
    assert.equal(out[9]?.p.source, "arxiv:cs.LG");
  });

  it("APS swap-in された quantum (prxquantum) は cap 適用時に保護される", () => {
    // top 10 すべて arXiv quantum (cap 超過確実)、未選抜に APS quantum 1 件 + 非 quantum 6 件
    // APS 最小保証で prxquantum が swap-in 後、cap 適用で arXiv quantum 6 件が cs.LG に置換される
    const scored: ScoredPaper[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        mkScored("arxiv:quant-ph", i, 100 - i, { quantum: true }),
      ),
      mkScored("aps:prxquantum", 1, 50, { quantum: true }),
      ...Array.from({ length: 6 }, (_, i) =>
        mkScored("arxiv:cs.LG", i, 40 - i),
      ),
    ];
    const out = selectFinalists(scored);
    assert.equal(out.length, 10);
    // APS 最小保証で prxquantum が必ず残る
    const apsCount = out.filter((s) => s.p.source.startsWith("aps:")).length;
    assert.equal(apsCount, 1, "APS 最小保証で prxquantum が残ること");
    const qCount = out.filter((s) =>
      `${s.p.title} ${s.p.abstract}`.toLowerCase().includes("quantum computing"),
    ).length;
    assert.equal(qCount, 4, "quantum 件数が PAPERS_QUANTUM_MAX(=4) まで減ること");
    // prxquantum は cap swap 対象から除外され、残っている
    assert.ok(
      out.some((s) => s.p.source === "aps:prxquantum"),
      "prxquantum が cap 適用後も残っていること",
    );
  });
});
