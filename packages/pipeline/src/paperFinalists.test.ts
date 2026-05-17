import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { selectFinalists, type ScoredPaper } from "./paperFinalists.js";
import type { ArxivPaper } from "./sources/arxiv.js";

function mkPaper(source: string, idx: number): ArxivPaper {
  return {
    arxivId: `${source}-${idx}`,
    title: `${source} paper ${idx}`,
    abstract: "abstract",
    authors: [],
    absUrl: `https://example.com/${source}/${idx}`,
    pdfUrl: `https://example.com/${source}/${idx}.pdf`,
    source,
    announceType: "new",
    publishedAt: "2026-05-15T00:00:00.000Z",
  };
}

function mkScored(source: string, idx: number, score: number): ScoredPaper {
  return {
    p: mkPaper(source, idx),
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
});
