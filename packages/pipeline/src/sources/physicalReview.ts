import { XMLParser } from "fast-xml-parser";
import { cleanText, fetchText } from "../util.js";
import type { ArxivPaper } from "./arxiv.js";
import { shortenAuthors, splitAuthorList } from "./arxiv.js";

const rdfParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
});

/**
 * APS RSS の content:encoded から abstract を抽出する。
 *
 * 観測したフォーマット:
 *   <p>Author(s): 著者リスト</p>
 *   <p>本文 (abstract)</p>
 *   <img ... /><br/>
 *   <p>[Phys. Rev. X N, NNN] Published ...</p>
 *
 * 2 番目の <p>...</p> ブロックを abstract とする。見つからない場合は
 * description フォールバックを試みる (Author(s): と末尾の citation を削る)。
 */
function extractAbstract(
  contentEncoded: string | undefined,
  description: string | undefined,
): string | null {
  if (contentEncoded) {
    const ps: string[] = [];
    const re = /<p>([\s\S]*?)<\/p>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(contentEncoded)) !== null) {
      const text = cleanText(m[1] ?? "");
      if (text) ps.push(text);
    }
    if (ps.length >= 2) {
      const candidate = ps[1] ?? "";
      if (candidate && !candidate.startsWith("Author(s):")) {
        return candidate;
      }
    }
  }
  if (description) {
    const cleaned = cleanText(description);
    if (!cleaned) return null;
    // Author(s): ... を頭から削る。最初の "and <Name>" の直後にスペースが続く
    // 想定だが、堅さよりも単純さを取り、". "/"]" を超えた最初のセンテンス境界で切る。
    const withoutAuthors = cleaned.replace(/^Author\(s\):[\s\S]*?(?=[A-Z][a-z])/, "");
    // 末尾の [Journal info] Published ... を削る
    const withoutCitation = withoutAuthors.replace(/\[[^\]]*\][^[]*Published[^[]*$/, "").trim();
    return withoutCitation || cleaned;
  }
  return null;
}

/**
 * APS RSS の content:encoded または description から Author(s) リストを抽出する。
 * フォーマット: "Author(s): F. Last, A. Other and X. Y"
 */
function extractAPSAuthors(
  contentEncoded: string | undefined,
  description: string | undefined,
): string[] {
  const hay = `${contentEncoded ?? ""} ${description ?? ""}`;
  const cleaned = cleanText(hay);
  const m = cleaned.match(/Author\(s\):\s*([^\n\r\[]+?)(?=\s{2,}|\.\s+[A-Z][a-z]{3,}|$)/);
  if (!m || !m[1]) return [];
  return shortenAuthors(splitAuthorList(m[1]));
}

interface RawRdfItem {
  title?: string;
  link?: string;
  description?: string;
  "content:encoded"?: string;
  "dc:date"?: string;
  "prism:doi"?: string;
  "@_rdf:about"?: string;
}

/**
 * APS RSS 1.0 (RDF) XML を ArxivPaper 形式にパースする (フィルタは適用しない)。
 * テストのため fetch から分離してある。
 */
export function parseAPSXml(xml: string, sourceId: string): ArxivPaper[] {
  const doc = rdfParser.parse(xml) as {
    "rdf:RDF"?: { item?: RawRdfItem | RawRdfItem[] };
  };
  const raw = doc["rdf:RDF"]?.item ?? [];
  const list = Array.isArray(raw) ? raw : [raw];

  const out: ArxivPaper[] = [];
  for (const it of list) {
    const link = it.link ?? it["@_rdf:about"] ?? "";
    if (!link) continue;
    const title = cleanText(it.title ?? "");
    if (!title) continue;
    const abstract = extractAbstract(it["content:encoded"], it.description);
    if (!abstract) continue;
    const authors = extractAPSAuthors(it["content:encoded"], it.description);
    const doi = it["prism:doi"] ?? link.split("/").pop() ?? link;
    const url = /^10\./.test(doi)
      ? `https://doi.org/${doi}`
      : link.replace(/^http:/, "https:");
    const dateRaw = it["dc:date"] ?? "";
    const parsed = dateRaw ? new Date(dateRaw) : new Date(NaN);
    const publishedAt = Number.isFinite(parsed.getTime())
      ? parsed.toISOString()
      : new Date().toISOString();
    out.push({
      arxivId: doi,
      title,
      abstract,
      authors,
      absUrl: url,
      pdfUrl: url,
      source: `aps:${sourceId}`,
      announceType: "new",
      publishedAt,
    });
  }
  return out;
}

const QUANTUM_FILTER_KEYWORDS = ["quantum", "qubit", "qaoa", "vqe"];

export interface APSFilterOptions {
  quantumOnly: boolean;
  maxAgeDays: number;
  /** テスト注入用。省略時は Date.now()。 */
  now?: number;
}

export function applyAPSFilters(
  papers: ArxivPaper[],
  opts: APSFilterOptions,
): ArxivPaper[] {
  const nowMs = opts.now ?? Date.now();
  const cutoff = nowMs - opts.maxAgeDays * 24 * 3600 * 1000;
  return papers.filter((p) => {
    const t = Date.parse(p.publishedAt);
    if (!Number.isFinite(t) || t < cutoff) return false;
    if (opts.quantumOnly) {
      const hay = `${p.title} ${p.abstract}`.toLowerCase();
      if (!QUANTUM_FILTER_KEYWORDS.some((k) => hay.includes(k))) return false;
    }
    return true;
  });
}

export async function fetchAPSFeed(
  id: string,
  url: string,
  opts: APSFilterOptions,
): Promise<ArxivPaper[]> {
  const xml = await fetchText(url);
  const all = parseAPSXml(xml, id);
  return applyAPSFilters(all, opts);
}
