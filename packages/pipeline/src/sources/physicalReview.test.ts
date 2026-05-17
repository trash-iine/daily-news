import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { applyAPSFilters, parseAPSXml } from "./physicalReview.js";
import type { ArxivPaper } from "./arxiv.js";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:prism="http://prismstandard.org/namespaces/basic/2.0/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns="http://purl.org/rss/1.0/">
  <channel rdf:about="http://journals.aps.org/prxquantum/">
    <title>Recent Articles in PRX Quantum</title>
    <link>http://journals.aps.org/prxquantum/</link>
    <description>Recent articles in PRX Quantum</description>
  </channel>
  <item rdf:about="http://link.aps.org/doi/10.1103/jtn1-wzyl">
    <title>Maximizing the Nondemolition Nature of a Quantum Measurement</title>
    <link>http://link.aps.org/doi/10.1103/jtn1-wzyl</link>
    <description>Author(s): Arjen Vaartjes, et al.&lt;br/&gt;&lt;p&gt;Adaptive subspace-switching readout improves qubit fidelity.&lt;/p&gt;&lt;br/&gt;[PRX Quantum 7, 020330] Published Fri May 15, 2026</description>
    <content:encoded><![CDATA[<p>Author(s): Arjen Vaartjes, et al.</p><p>Adaptive subspace-switching readout improves qubit fidelity.</p><img src="x.png"/><br/><p>[PRX Quantum 7, 020330] Published Fri May 15, 2026</p>]]></content:encoded>
    <dc:date>2026-05-15T10:00:00+00:00</dc:date>
    <prism:doi>10.1103/jtn1-wzyl</prism:doi>
  </item>
  <item rdf:about="http://link.aps.org/doi/10.1103/old-paper">
    <title>Some Old Optics Paper</title>
    <link>http://link.aps.org/doi/10.1103/old-paper</link>
    <description>Author(s): Old Author&lt;br/&gt;&lt;p&gt;Classical optics result on lens design.&lt;/p&gt;&lt;br/&gt;</description>
    <content:encoded><![CDATA[<p>Author(s): Old Author</p><p>Classical optics result on lens design.</p>]]></content:encoded>
    <dc:date>2025-01-01T00:00:00+00:00</dc:date>
    <prism:doi>10.1103/old-paper</prism:doi>
  </item>
</rdf:RDF>`;

describe("parseAPSXml", () => {
  it("rdf:RDF > item を ArxivPaper 形式に変換する", () => {
    const out = parseAPSXml(SAMPLE_XML, "prxquantum");
    assert.equal(out.length, 2);
    const first = out[0] as ArxivPaper;
    assert.equal(first.title, "Maximizing the Nondemolition Nature of a Quantum Measurement");
    assert.equal(first.source, "aps:prxquantum");
    assert.equal(first.announceType, "new");
    assert.equal(first.absUrl, "https://doi.org/10.1103/jtn1-wzyl");
    assert.equal(first.arxivId, "10.1103/jtn1-wzyl");
    assert.equal(first.publishedAt, "2026-05-15T10:00:00.000Z");
  });

  it("content:encoded の 2 番目の <p> ブロックを abstract として採用する", () => {
    const out = parseAPSXml(SAMPLE_XML, "prxquantum");
    const first = out[0] as ArxivPaper;
    assert.equal(first.abstract, "Adaptive subspace-switching readout improves qubit fidelity.");
    assert.ok(!first.abstract.startsWith("Author(s):"));
    assert.ok(!first.abstract.includes("Published"));
  });
});

describe("applyAPSFilters", () => {
  const now = Date.parse("2026-05-16T00:00:00Z");

  it("maxAgeDays を超える item は除外する", () => {
    const all = parseAPSXml(SAMPLE_XML, "prxquantum");
    const fresh = applyAPSFilters(all, { quantumOnly: false, maxAgeDays: 14, now });
    assert.equal(fresh.length, 1);
    assert.equal(fresh[0]?.arxivId, "10.1103/jtn1-wzyl");
  });

  it("quantumOnly=true で量子キーワードを含まない item を除外する", () => {
    const all = parseAPSXml(SAMPLE_XML, "prxquantum");
    // 期限を緩めても、quantumOnly=true なら old-paper は落ちる
    const filtered = applyAPSFilters(all, {
      quantumOnly: true,
      maxAgeDays: 365 * 2,
      now,
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.arxivId, "10.1103/jtn1-wzyl");
  });

  it("quantumOnly=false なら量子関連でない item も通す", () => {
    const all = parseAPSXml(SAMPLE_XML, "prxquantum");
    const filtered = applyAPSFilters(all, {
      quantumOnly: false,
      maxAgeDays: 365 * 2,
      now,
    });
    assert.equal(filtered.length, 2);
  });
});
