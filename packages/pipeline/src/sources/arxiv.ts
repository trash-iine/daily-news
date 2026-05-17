import { XMLParser } from "fast-xml-parser";
import { cleanText, fetchText } from "../util.js";

const rssParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
});

export type AnnounceType = "new" | "cross" | "replace" | "unknown";

export interface ArxivPaper {
  arxivId: string;
  title: string;
  abstract: string;
  /** 著者表示用リスト (最大 3 + "+N")。RSS から拾えなかった場合は空配列。 */
  authors: string[];
  absUrl: string;
  pdfUrl: string;
  source: string;
  /**
   * arXiv RSS の announce_type。
   * - new:     新規投稿
   * - cross:   別カテゴリへのクロスリスティング
   * - replace: 既存論文の更新
   * 通常は "new" のみを採用する。
   */
  announceType: AnnounceType;
  publishedAt: string;
}

interface RssItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  "arxiv:announce_type"?: string | { "#text"?: string };
  /** dc:creator は単一文字列 or 配列で来る (fast-xml-parser のデフォルト挙動)。 */
  "dc:creator"?: string | string[] | { "#text"?: string };
}

const ABSTRACT_MARKER = "Abstract: ";
const AUTHORS_MARKER = "Authors:";
const MAX_DISPLAY_AUTHORS = 3;

/**
 * arXiv RSS の description から著者リストを抽出する。
 *
 * description のフォーマット (実観測):
 *   "arXiv:2401.12345 Announce Type: new \nAbstract: ..."
 * 著者は同じ description 内に居らず <dc:creator> / Atom author に居る。
 * fast-xml-parser はデフォルトで <dc:creator> を文字列または配列として扱うので、
 * 別ヘルパで拾う。ここではフォールバック用に description 内 "Authors:" 行も拾えるよう
 * しておく。
 */
function extractAuthorsFromDescription(description: string): string[] {
  const decoded = cleanText(description);
  const idx = decoded.indexOf(AUTHORS_MARKER);
  if (idx === -1) return [];
  // "Authors: A, B, C\nAbstract: ..." を想定。Abstract 以降を切る。
  const endIdx = decoded.indexOf(ABSTRACT_MARKER, idx);
  const slice =
    endIdx === -1
      ? decoded.slice(idx + AUTHORS_MARKER.length)
      : decoded.slice(idx + AUTHORS_MARKER.length, endIdx);
  return splitAuthorList(slice);
}

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

function arxivIdFromLink(link: string): string | null {
  const m = link.match(/\/abs\/([^/?#]+)/);
  return m?.[1] ?? null;
}

function pickText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "#text" in v) {
    return String((v as { "#text"?: unknown })["#text"] ?? "");
  }
  return "";
}

function extractAbstract(description: string): string | null {
  const decoded = cleanText(description);
  const idx = decoded.indexOf(ABSTRACT_MARKER);
  if (idx === -1) return null;
  return decoded.slice(idx + ABSTRACT_MARKER.length).trim();
}

function parseAnnounceType(raw: string): AnnounceType {
  const v = raw.trim().toLowerCase();
  if (v === "new" || v === "cross" || v === "replace") return v;
  return "unknown";
}

function extractAuthors(it: RssItem): string[] {
  // 優先: <dc:creator>。arXiv RSS は "Lastname, F." 形式の文字列を 1 つ返してくる
  // (複数著者でも 1 文字列にカンマ区切りで詰まる) ので、splitAuthorList で分解する。
  const creator = it["dc:creator"];
  let raw = "";
  if (typeof creator === "string") {
    raw = creator;
  } else if (Array.isArray(creator)) {
    raw = creator.map((c) => (typeof c === "string" ? c : pickText(c))).join(",");
  } else if (creator && typeof creator === "object") {
    raw = pickText(creator);
  }
  const fromCreator = splitAuthorList(cleanText(raw));
  if (fromCreator.length > 0) return shortenAuthors(fromCreator);
  // フォールバック: description 内の "Authors:" 行
  const fromDesc = extractAuthorsFromDescription(it.description ?? "");
  return shortenAuthors(fromDesc);
}

export async function fetchArxivCategory(category: string): Promise<ArxivPaper[]> {
  const xml = await fetchText(`https://export.arxiv.org/rss/${category}`);
  const doc = rssParser.parse(xml) as {
    rss?: { channel?: { item?: RssItem | RssItem[] } };
  };
  const items = doc.rss?.channel?.item ?? [];
  const list = Array.isArray(items) ? items : [items];

  const out: ArxivPaper[] = [];
  for (const it of list) {
    const link = it.link ?? "";
    const arxivId = arxivIdFromLink(link);
    if (!arxivId) continue;
    const abstract = extractAbstract(it.description ?? "");
    if (!abstract) continue;
    const announceType = parseAnnounceType(pickText(it["arxiv:announce_type"]));
    const pubIso = it.pubDate
      ? new Date(it.pubDate).toISOString()
      : new Date().toISOString();
    out.push({
      arxivId,
      title: cleanText(it.title ?? ""),
      abstract,
      authors: extractAuthors(it),
      absUrl: link,
      pdfUrl: link.replace("/abs/", "/pdf/"),
      source: `arxiv:${category}`,
      announceType,
      publishedAt: pubIso,
    });
  }
  return out;
}
