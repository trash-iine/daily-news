import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseArxivApiXml } from "./arxiv.js";

const FEED = `<?xml version='1.0' encoding='UTF-8'?>
<feed xmlns:arxiv="http://arxiv.org/schemas/atom" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2606.24625v1</id>
    <title>QC-SMOTE: Quality-Controlled SMOTE</title>
    <published>2026-06-23T14:23:18Z</published>
    <updated>2026-06-23T14:23:18Z</updated>
    <link href="https://arxiv.org/abs/2606.24625v1" rel="alternate" type="text/html"/>
    <link href="https://arxiv.org/pdf/2606.24625v1" rel="related" type="application/pdf" title="pdf"/>
    <summary>A new oversampling framework for imbalanced classification.</summary>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:primary_category term="cs.LG"/>
    <author><name>Parth Upman</name></author>
    <author><name>Shreyank N Gowda</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2606.11111v2</id>
    <title>Revised Paper</title>
    <published>2026-06-20T00:00:00Z</published>
    <updated>2026-06-23T00:00:00Z</updated>
    <link href="https://arxiv.org/abs/2606.11111v2" rel="alternate" type="text/html"/>
    <summary>A revised version.</summary>
    <arxiv:primary_category term="cs.LG"/>
    <author><name>Solo Author</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2606.22222v1</id>
    <title>Cross Listed Paper</title>
    <published>2026-06-23T00:00:00Z</published>
    <updated>2026-06-23T00:00:00Z</updated>
    <link href="https://arxiv.org/abs/2606.22222v1" rel="alternate" type="text/html"/>
    <summary>Primarily a math paper cross-listed into cs.LG.</summary>
    <arxiv:primary_category term="math.OC"/>
    <author><name>Cross Author</name></author>
  </entry>
</feed>`;

describe("parseArxivApiXml", () => {
  const papers = parseArxivApiXml(FEED, "cs.LG");

  it("全 entry をパースする", () => {
    assert.equal(papers.length, 3);
  });

  it("v1 かつ primary 一致は new", () => {
    const p = papers.find((x) => x.arxivId === "2606.24625v1");
    assert.ok(p);
    assert.equal(p.announceType, "new");
    assert.equal(p.source, "arxiv:cs.LG");
    assert.equal(p.absUrl, "https://arxiv.org/abs/2606.24625v1");
    assert.equal(p.pdfUrl, "https://arxiv.org/pdf/2606.24625v1");
    assert.deepEqual(p.authors, ["Parth Upman", "Shreyank N Gowda"]);
    assert.equal(p.publishedAt, "2026-06-23T14:23:18.000Z");
  });

  it("v2 以降は replace", () => {
    const p = papers.find((x) => x.arxivId === "2606.11111v2");
    assert.ok(p);
    assert.equal(p.announceType, "replace");
    assert.deepEqual(p.authors, ["Solo Author"]);
  });

  it("primary_category が別カテゴリなら cross", () => {
    const p = papers.find((x) => x.arxivId === "2606.22222v1");
    assert.ok(p);
    assert.equal(p.announceType, "cross");
  });

  it("pdf link が無ければ absUrl から導出する", () => {
    const p = papers.find((x) => x.arxivId === "2606.11111v2");
    assert.ok(p);
    assert.equal(p.pdfUrl, "https://arxiv.org/pdf/2606.11111v2");
  });

  it("entry が空ならからの配列", () => {
    assert.deepEqual(parseArxivApiXml("<feed></feed>", "cs.LG"), []);
  });
});
