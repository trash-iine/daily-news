import { XMLParser } from "fast-xml-parser";
import { cleanText, fetchText, toISOorNow } from "../util.js";

const atomParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
});

export type AnnounceType = "new" | "cross" | "replace" | "unknown";

export interface ArxivPaper {
  arxivId: string;
  title: string;
  abstract: string;
  /** 著者表示用リスト (最大 3 + "+N")。拾えなかった場合は空配列。 */
  authors: string[];
  absUrl: string;
  pdfUrl: string;
  source: string;
  /**
   * 投稿種別。arXiv RSS の announce_type を Atom API のメタから再現する。
   * - new:     新規投稿 (v1 かつ primary_category が問い合わせカテゴリと一致)
   * - cross:   別カテゴリへのクロスリスティング (primary_category が別)
   * - replace: 既存論文の更新 (v2 以降)
   * 通常は "new" のみを採用する (ranking.ts:rankPapers)。
   */
  announceType: AnnounceType;
  publishedAt: string;
}

const MAX_DISPLAY_AUTHORS = 3;

/** "A, B, C and D" / "A; B; C" を name 配列に分解。 */
export function splitAuthorList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .replace(/\s+and\s+/gi, ",")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 著者リストを表示用に短縮 (最大 MAX_DISPLAY_AUTHORS + "+N")。 */
export function shortenAuthors(
  all: string[],
  max: number = MAX_DISPLAY_AUTHORS,
): string[] {
  if (all.length <= max) return [...all];
  const head = all.slice(0, max);
  head.push(`+${all.length - max}`);
  return head;
}

interface AtomLink {
  "@_href"?: string;
  "@_rel"?: string;
  "@_title"?: string;
  "@_type"?: string;
}

interface AtomAuthor {
  name?: string | { "#text"?: string };
}

interface AtomEntry {
  id?: string;
  title?: string;
  summary?: string;
  published?: string;
  updated?: string;
  link?: AtomLink | AtomLink[];
  author?: AtomAuthor | AtomAuthor[];
  "arxiv:primary_category"?: { "@_term"?: string };
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function pickName(a: AtomAuthor): string {
  const n = a.name;
  if (typeof n === "string") return n;
  if (n && typeof n === "object" && "#text" in n) return String(n["#text"] ?? "");
  return "";
}

/** Atom entry の <author><name> 群を表示用リストに変換する。 */
function extractAtomAuthors(entry: AtomEntry): string[] {
  const names = asArray(entry.author)
    .map((a) => cleanText(pickName(a)))
    .filter((s) => s.length > 0);
  return shortenAuthors(names);
}

/** <id> (http://arxiv.org/abs/2606.24625v1) から id 部分を取り出す。 */
function arxivIdFromAtomId(id: string): string | null {
  const m = id.match(/abs\/(.+)$/);
  return m?.[1] ?? null;
}

/** 末尾の vN からバージョン番号を取る。無ければ 1 とみなす。 */
function versionFromId(arxivId: string): number {
  const m = arxivId.match(/v(\d+)$/);
  return m ? Number(m[1]) : 1;
}

function pickLink(
  links: AtomLink[],
  predicate: (l: AtomLink) => boolean,
): string | null {
  const hit = links.find(predicate);
  return hit?.["@_href"] ?? null;
}

/**
 * RSS の announce_type を Atom メタから再現する。
 * - primary_category が問い合わせカテゴリと異なる → cross
 * - v2 以降 → replace
 * - それ以外 (v1 かつ primary 一致) → new
 */
function deriveAnnounceType(
  version: number,
  primaryCategory: string | undefined,
  category: string,
): AnnounceType {
  if (primaryCategory && primaryCategory !== category) return "cross";
  if (version > 1) return "replace";
  return "new";
}

/**
 * arXiv Atom API (export.arxiv.org/api/query) のレスポンスを ArxivPaper[] に変換する。
 * fetch から分離してテスト可能にしてある (parseAPSXml と同じ設計)。
 */
export function parseArxivApiXml(xml: string, category: string): ArxivPaper[] {
  const doc = atomParser.parse(xml) as {
    feed?: { entry?: AtomEntry | AtomEntry[] };
  };
  const entries = asArray(doc.feed?.entry);

  const out: ArxivPaper[] = [];
  for (const e of entries) {
    const rawId = e.id ?? "";
    const arxivId = arxivIdFromAtomId(rawId);
    if (!arxivId) continue;
    const abstract = cleanText(e.summary ?? "");
    if (!abstract) continue;
    const title = cleanText(e.title ?? "");
    if (!title) continue;

    const links = asArray(e.link);
    const absUrl =
      pickLink(links, (l) => l["@_rel"] === "alternate") ??
      rawId.replace(/^http:/, "https:");
    const pdfUrl =
      pickLink(links, (l) => l["@_title"] === "pdf") ??
      absUrl.replace("/abs/", "/pdf/");

    const primaryCategory = e["arxiv:primary_category"]?.["@_term"];
    const announceType = deriveAnnounceType(
      versionFromId(arxivId),
      primaryCategory,
      category,
    );

    out.push({
      arxivId,
      title,
      abstract,
      authors: extractAtomAuthors(e),
      absUrl,
      pdfUrl,
      source: `arxiv:${category}`,
      announceType,
      publishedAt: toISOorNow(e.published),
    });
  }
  return out;
}

const ARXIV_API_MAX_RESULTS = 100;

/**
 * arXiv の 1 カテゴリを安定版 Atom API から取得する。
 *
 * 旧実装は RSS (export.arxiv.org/rss/{cat}) を叩いていたが、新ホスト rss.arxiv.org の
 * RSS は item 0 件を返す不具合が観測されたため、論文データを確実に返す Atom API
 * (export.arxiv.org/api/query) に切り替えた。announce_type は RSS に無いので
 * parseArxivApiXml 内で version / primary_category から再現する。
 *
 * maxAgeDays が指定された場合、publishedAt がそれより古い entry を除外する
 * (API は新着順だが古い更新の混入を防ぐ安全網)。
 */
export async function fetchArxivCategory(
  category: string,
  maxAgeDays?: number,
): Promise<ArxivPaper[]> {
  const url =
    `https://export.arxiv.org/api/query?search_query=cat:${category}` +
    `&sortBy=submittedDate&sortOrder=descending&max_results=${ARXIV_API_MAX_RESULTS}`;
  const xml = await fetchText(url);
  const papers = parseArxivApiXml(xml, category);
  if (maxAgeDays === undefined) return papers;
  const cutoff = Date.now() - maxAgeDays * 24 * 3600 * 1000;
  return papers.filter((p) => {
    const t = Date.parse(p.publishedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
}
