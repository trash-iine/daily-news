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
}

const ABSTRACT_MARKER = "Abstract: ";

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
      absUrl: link,
      pdfUrl: link.replace("/abs/", "/pdf/"),
      source: `arxiv:${category}`,
      announceType,
      publishedAt: pubIso,
    });
  }
  return out;
}
