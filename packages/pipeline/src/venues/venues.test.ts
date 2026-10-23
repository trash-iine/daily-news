import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { pageLines, parseAcceptedList, parseMiniconfList } from "./acceptedList.js";
import { matchVenueComment } from "./arxivComments.js";
import { passesVenueGate } from "./gate.js";
import { parseCrossrefWorks, parseEcccRss } from "./journals.js";
import { pickArxivPaper, titleSearchWords } from "./match.js";
import type { ArxivPaper } from "../sources/arxiv.js";
import { findVenuePaper, mergeAcceptedEntries, newVenueList } from "./store.js";
import { authorsOverlap, splitAuthorsLine, titleKey, titleSimilarity } from "./titles.js";

// STOC 2026 の採択リストと同じ構造 (<LI><B>title</B><br>authors</LI>)。件数だけ水増しする。
function stocHtml(year: number, n: number): string {
  const lis = Array.from(
    { length: n },
    (_, i) => `<LI><B>Paper Title Number ${i}</B><br>Alice Smith${i} (MIT); Bob Jones, Carol Wu (CMU)</LI><br/>`,
  ).join("\n");
  return `<html><head><title>STOC ${year}</title>
<script>$(function(){ $("#navigationbar").load("navbar.html"); });</script></head>
<body><h1>STOC ${year} Accepted Papers</h1><UL>${lis}</UL></body></html>`;
}

describe("parseAcceptedList", () => {
  it("見出しの後のタイトル行と著者行を交互に読む", () => {
    const entries = parseAcceptedList(pageLines(stocHtml(2026, 12), "html"), "STOC", 2026);
    assert.ok(entries);
    assert.equal(entries.length, 12);
    assert.deepEqual(entries[0], {
      title: "Paper Title Number 0",
      authors: ["Alice Smith0", "Bob Jones", "Carol Wu"],
    });
  });

  it("タイトル中の上付き/下付きで行が割れない (STOC 2026 の SVP<sub>p</sub> 等)", () => {
    const html = stocHtml(2026, 10).replace(
      "Paper Title Number 3",
      "SVP<sub>p</sub> is NP-Hard Within 2<sup>log<sup>1-&epsilon;</sup>n</sup>",
    );
    const entries = parseAcceptedList(pageLines(html, "html"), "STOC", 2026);
    assert.equal(entries?.length, 10);
    assert.equal(entries?.[3]?.title, "SVP_p is NP-Hard Within 2^log^1-εn");
    assert.deepEqual(entries?.[4]?.authors, ["Alice Smith4", "Bob Jones", "Carol Wu"]);
  });

  it("FOCS のようにタイトルと著者が隣接 <span> でも分かれる", () => {
    const rows = Array.from(
      { length: 10 },
      (_, i) =>
        `<tr><td><span class="paper-title">Title ${i}</span><span class="paper-authors">Nick Fischer (MPI); Adam Polak (Bocconi)</span></td></tr>`,
    ).join("");
    const json = JSON.stringify([{ content: { rendered: `<h2>FOCS 2026 Accepted Papers</h2><table>${rows}</table>` } }]);
    const entries = parseAcceptedList(pageLines(json, "wp-json"), "FOCS", 2026);
    assert.equal(entries?.length, 10);
    assert.deepEqual(entries?.[9], { title: "Title 9", authors: ["Nick Fischer", "Adam Polak"] });
  });

  it("見出しの年が違うページ (前年の内容が残ったページ) は採らない", () => {
    assert.equal(parseAcceptedList(pageLines(stocHtml(2024, 12), "html"), "STOC", 2026), null);
  });

  it("件数が少なすぎるページは準備中とみなす", () => {
    assert.equal(parseAcceptedList(pageLines(stocHtml(2026, 3), "html"), "STOC", 2026), null);
  });

  it("wp-json の pages 配列から本文を取り出す", () => {
    const body = stocHtml(2026, 10).replaceAll("STOC", "FOCS");
    const json = JSON.stringify([{ content: { rendered: body }, link: "https://focs.example/" }]);
    const entries = parseAcceptedList(pageLines(json, "wp-json"), "FOCS", 2026);
    assert.equal(entries?.length, 10);
  });
});

describe("titles", () => {
  it("所属の括弧書き (入れ子を含む) を落として著者を分ける", () => {
    assert.deepEqual(
      splitAuthorsLine(
        'Bernhard Haeupler (INSAIT, Sofia University "St. Kliment Ohridski" & ETH Zurich); Yonggang Jiang (MPI (Saarland)) and Thatchaphol Saranurak',
      ),
      ["Bernhard Haeupler", "Yonggang Jiang", "Thatchaphol Saranurak"],
    );
  });

  it("LaTeX と記号の表記揺れを吸収する", () => {
    assert.equal(
      titleKey("Strassen’s support functionals: $\\tilde{O}(1)$-Depth"),
      titleKey("Strassen's Support Functionals: -Depth"),
    );
    assert.ok(titleSimilarity("The Keyl–Werner algorithm is not optimal", "The Keyl-Werner Algorithm Is Not Optimal") === 1);
  });

  it("姓が 1 人でも一致すれば著者が重なるとみなす (アクセント記号は無視)", () => {
    assert.ok(authorsOverlap(["Édouard Bonnet", "Jason Li"], ["E. Bonnet"]));
    assert.ok(!authorsOverlap(["Jason Li"], ["Yang Liu"]));
  });
});

describe("matchVenueComment", () => {
  const years = [2026, 2027];
  it("採択表記から年を取る", () => {
    assert.equal(matchVenueComment("To appear in FOCS 2026", "FOCS", years), 2026);
    assert.equal(matchVenueComment("Accepted to SODA'27. 40 pages", "SODA", years), 2027);
  });
  it("投稿中の表記・離れた出現・別の年は採らない", () => {
    assert.equal(matchVenueComment("Submitted to SODA 2027", "SODA", years), null);
    assert.equal(matchVenueComment("FOCS version; full version 2026", "FOCS", years), null);
    assert.equal(matchVenueComment("In STOC 2024", "STOC", years), null);
    assert.equal(matchVenueComment(undefined, "STOC", years), null);
  });
  it("ハイフン区切りの短縮年 (AAAI-26) を読む", () => {
    assert.equal(matchVenueComment("Accepted by AAAI-26 (oral)", "AAAI", years), 2026);
  });
  it("併設ワークショップの論文は本会議の採択とみなさない", () => {
    assert.equal(matchVenueComment("Accepted at the ICML 2026 Workshop on Efficient Systems", "ICML", years), null);
    assert.equal(matchVenueComment("Presented at the AI4Math Workshop at NeurIPS 2026", "NeurIPS", years), null);
    assert.equal(matchVenueComment("Accepted at NeurIPS 2026 (Spotlight)", "NeurIPS", years), 2026);
  });
  it("別会議名の一部には一致しない (CP と CPAIOR、SAT と MaxSAT)", () => {
    assert.equal(matchVenueComment("To appear in CPAIOR 2026", "CP", years), null);
    assert.equal(matchVenueComment("MaxSAT 2026 Evaluation", "SAT", years), null);
  });
});

describe("parseMiniconfList", () => {
  const page = (year: number, n: number) =>
    `<noscript class="noscript">Enable Javascript<ul>${Array.from(
      { length: n },
      (_, i) => `<li><a href="/virtual/${year}/poster/${100 + i}">Neural Solver &amp; Heuristic ${i}</a></li>`,
    ).join("\n")}<li><a href="/virtual/${year}/session/1">Oral Session 1</a></li></ul></noscript>`;

  it("noscript のポスター一覧からタイトルを読む (セッションは除く)", () => {
    const entries = parseMiniconfList(page(2026, 12), 2026);
    assert.equal(entries?.length, 12);
    assert.deepEqual(entries?.[0], { title: "Neural Solver & Heuristic 0", authors: [] });
  });
  it("別年のリンクや空の一覧 (公開前の来年分サイト) は採らない", () => {
    assert.equal(parseMiniconfList(page(2026, 12), 2027), null);
    assert.equal(parseMiniconfList(page(2027, 0), 2027), null);
  });
});

describe("passesVenueGate", () => {
  it("タイトルが重みの大きい関心語を含むか量子の論文だけ通す", () => {
    assert.ok(passesVenueGate("Diffusion Solvers for Neural Combinatorial Optimization"));
    assert.ok(passesVenueGate("Neural QAOA Parameter Initialization"));
    assert.ok(!passesVenueGate("Omni-Perception Policy Optimization for Emotion Reasoning"));
    assert.ok(!passesVenueGate("Adaptive Request Scheduling for LLM Inference"));
  });
});

describe("pickArxivPaper", () => {
  const paper = (title: string, authors: string[]): ArxivPaper => ({
    arxivId: "2602.16153v1",
    title,
    abstract: "",
    authors,
    absUrl: "",
    pdfUrl: "",
    source: "",
    announceType: "new",
    publishedAt: "",
  });

  it("arXiv の検索結果からタイトルと著者が一致するものを選ぶ", () => {
    const hit = pickArxivPaper(
      [
        paper("Bellman-Ford for Sparse Graphs", ["Jane Doe"]),
        paper("Bellman-Ford in Almost-Linear Time for Dense Graphs", ["Satya Lokam", "Jane Doe", "+3"]),
      ],
      "Bellman-Ford in Almost-Linear Time for Dense Graphs",
      ["Jane Doe"],
    );
    assert.equal(hit?.title, "Bellman-Ford in Almost-Linear Time for Dense Graphs");
  });

  it("タイトルが同じでも著者が重ならなければ採らない", () => {
    assert.equal(
      pickArxivPaper([paper("Robust Learning with Optimal Error", ["Someone Else"])], "Robust Learning with Optimal Error", [
        "Guy Blanc",
      ]),
      null,
    );
  });

  it("著者が分からない (ML 会議の一覧) ときはタイトルのほぼ一致だけで選ぶ", () => {
    const papers = [
      paper("Latent Guided Sampling for Combinatorial Optimization", ["Jane Doe"]),
      paper("Latent Sampling for Combinatorial Optimization Problems", ["John Roe"]),
    ];
    assert.equal(
      pickArxivPaper(papers, "Latent Guided Sampling for Combinatorial Optimization", [])?.authors[0],
      "Jane Doe",
    );
    assert.equal(pickArxivPaper(papers.slice(1), "Latent Guided Sampling for Combinatorial Optimization", []), null);
  });

  it("検索語は短い語と LaTeX を除いて最大 6 語", () => {
    assert.deepEqual(titleSearchWords("$\\tilde{O}(1)$-Depth Parallel Reachability Faster than Transitive Closure for All of Us"), [
      "depth",
      "parallel",
      "reachability",
      "faster",
      "than",
      "transitive",
    ]);
  });
});

describe("venue store", () => {
  it("採択リストの取り込みは既存 (comments 由来) を残して新規だけ足す", () => {
    const list = newVenueList("FOCS", 2026, "2026-10-24");
    list.papers.push({
      title: "3SUM Is Really Hard",
      authors: ["Nick Fischer"],
      arxivId: "2610.10153",
      arxivFoundOn: "2026-10-07",
      score: 0,
      matchedKeywords: [],
      via: "arxiv-comment",
    });
    const added = mergeAcceptedEntries(list, [
      { title: "3SUM is really hard", authors: ["Nick Fischer"] },
      { title: "Dense Subset Sum in Multi-Dimension", authors: ["A B"] },
    ]);
    assert.equal(added, 1);
    assert.equal(list.papers.length, 2);
    assert.equal(list.papers[0]?.arxivId, "2610.10153");
    assert.equal(findVenuePaper(list, { title: "Dense subset sum in multi-dimension" })?.via, "accepted-list");
    assert.equal(list.slug, "focs-2026");
  });
});

describe("venue store (同一リスト内の似たタイトル)", () => {
  it("同じ採択リスト内の Part I / Part II は別論文として両方残す", () => {
    const list = newVenueList("STOC", 2027, "2027-02-10");
    const added = mergeAcceptedEntries(list, [
      { title: "Fast Algorithms for Max-Cut, Part I", authors: ["A B"] },
      { title: "Fast Algorithms for Max-Cut, Part II", authors: ["A B"] },
    ]);
    assert.equal(added, 2);
  });
});

describe("journals", () => {
  it("Crossref の works から正誤表を除き、JATS の Abstract 見出しを落とす", () => {
    const json = JSON.stringify({
      message: {
        items: [
          {
            DOI: "10.1137/24m1689946",
            URL: "https://doi.org/10.1137/24m1689946",
            title: ["Learning Shallow Quantum Circuits"],
            abstract: "<jats:p>Abstract.</jats:p><jats:p>Despite fundamental interests.</jats:p>",
            author: [{ given: "Hsin-Yuan", family: "Huang" }],
            created: { "date-time": "2026-10-19T10:00:00Z" },
          },
          { DOI: "10.1137/x", title: ["Erratum: Something"] },
        ],
      },
    });
    const out = parseCrossrefWorks(json, { id: "sicomp", name: "SIAM J. Comput.", issn: "0097-5397", important: true });
    assert.equal(out.length, 1);
    assert.equal(out[0]?.abstract, "Despite fundamental interests.");
    assert.deepEqual(out[0]?.authors, ["Hsin-Yuan Huang"]);
    assert.equal(out[0]?.source, "journal:sicomp");
    assert.equal(out[0]?.important, true);
  });

  it("ECCC の title (TR番号 | タイトル | 著者) を分解し、古い item を落とす", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>TR26-268 |  A Linear Lower Bound on Testing Graph Isomorphism |
  Amit Dror
</title><link>https://eccc.weizmann.ac.il/report/2026/268</link>
<description>We prove a lower bound.</description><pubDate>Thu, 22 Oct 2026 13:50:33 +0300</pubDate></item>
<item><title>TR26-001 | Old | X</title><link>https://eccc.weizmann.ac.il/report/2026/001</link>
<description>old</description><pubDate>Thu, 01 Jan 2026 00:00:00 +0300</pubDate></item>
</channel></rss>`;
    const out = parseEcccRss(xml, 3, Date.parse("2026-10-23T00:00:00Z"));
    assert.equal(out.length, 1);
    assert.equal(out[0]?.title, "A Linear Lower Bound on Testing Graph Isomorphism");
    assert.deepEqual(out[0]?.authors, ["Amit Dror"]);
    assert.equal(out[0]?.venue, "ECCC");
  });
});
