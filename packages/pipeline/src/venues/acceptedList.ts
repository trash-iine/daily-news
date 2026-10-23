import type { AcceptedListConfig } from "../config.js";
import { decodeHtmlEntities, fetchText, hashId } from "../util.js";
import { splitAuthorsLine } from "./titles.js";

export interface AcceptedEntry {
  title: string;
  authors: string[];
}

export interface AcceptedListPage {
  url: string;
  /** パース結果 (タイトル + 著者) のハッシュ。ページの装飾だけの変更では変わらない。 */
  hash: string;
  entries: AcceptedEntry[];
}

/** 採択リストとして信用する最小件数。これ未満は「準備中ページ」とみなす。 */
const MIN_ENTRIES = 10;
/** 著者行のうち所属の括弧書きを含む割合の下限。交互の並びが崩れたページを弾く。 */
const MIN_AFFILIATION_RATIO = 0.8;

/** 取得した生レスポンスを、空行を除いたテキスト行に直す。 */
export function pageLines(raw: string, format: AcceptedListConfig["format"]): string[] {
  let html = raw;
  if (format === "wp-json") {
    const parsed = JSON.parse(raw) as unknown;
    const page = (Array.isArray(parsed) ? parsed[0] : parsed) as
      | { content?: { rendered?: string } }
      | undefined;
    html = page?.content?.rendered ?? "";
  }
  // タイトル中の上付き/下付き・強調 (STOC: "n<sup>1/2</sup>") で行が割れないよう、文字装飾タグは
  // 改行にせず畳む。それ以外のタグは区切りとして改行にする (FOCS はタイトルと著者が隣接 <span>)。
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<sup[^>]*>/gi, "^")
    .replace(/<sub[^>]*>/gi, "_")
    .replace(/<\/?(sup|sub|i|em|u|small|font|code|tt)(\s[^>]*)?>/gi, "")
    .replace(/<[^>]+>/g, "\n");
  return decodeHtmlEntities(text)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

/**
 * 見出し `<VENUE> <YEAR> Accepted Papers` の後に「タイトル行 → 著者行」が交互に並ぶ形式を読む。
 * 見出しの年が一致しない (= 前年の内容が残ったページ) 場合や、並びが崩れている場合は null。
 */
export function parseAcceptedList(
  lines: string[],
  venue: string,
  year: number,
): AcceptedEntry[] | null {
  const heading = new RegExp(`\\b${venue}\\s*'?${year}\\b.*accepted papers`, "i");
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return null;

  const entries: AcceptedEntry[] = [];
  let withAffiliation = 0;
  for (let i = start + 1; i + 1 < lines.length; i += 2) {
    const title = lines[i] as string;
    const authorsLine = lines[i + 1] as string;
    const authors = splitAuthorsLine(authorsLine);
    if (authors.length === 0) break;
    if (/\(.*\)/.test(authorsLine)) withAffiliation++;
    entries.push({ title, authors });
  }
  if (entries.length < MIN_ENTRIES) return null;
  if (withAffiliation / entries.length < MIN_AFFILIATION_RATIO) return null;
  return entries;
}

/**
 * NeurIPS / ICML / ICLR の会議サイト (papers.html) の <noscript> にあるタイトル一覧を読む。
 * 著者は載っていないので空 (arXiv 照合ではタイトルのほぼ一致で判定し、著者は arXiv 側から埋める)。
 * リンクのパスに年が入っている (`/virtual/2026/poster/123`) ので、別年のページは一致しない。
 * 来年分のサイトは公開前でも 200 で空の一覧を返す (ICLR) ので、件数の下限で弾く。
 */
export function parseMiniconfList(raw: string, year: number): AcceptedEntry[] | null {
  const re = new RegExp(`<li><a href="/virtual/${year}/poster/\\d+">([^<]+)</a>`, "g");
  const entries = [...raw.matchAll(re)].map((m) => ({
    title: decodeHtmlEntities(m[1] as string).replace(/\s+/g, " ").trim(),
    authors: [],
  }));
  return entries.length >= MIN_ENTRIES ? entries : null;
}

/**
 * 1 会議 1 年分の採択リストを取る。ページ未公開 (404 等) / 形式不一致なら null。
 * 未公開は毎日起こる正常系なので throw しない。
 */
export async function fetchAcceptedList(
  cfg: AcceptedListConfig,
  year: number,
): Promise<AcceptedListPage | null> {
  const url = cfg.urlTemplate.replaceAll("{year}", String(year));
  let raw: string;
  try {
    raw = await fetchText(url);
  } catch {
    return null;
  }
  let entries: AcceptedEntry[] | null;
  if (cfg.format === "miniconf") {
    entries = parseMiniconfList(raw, year);
  } else {
    try {
      entries = parseAcceptedList(pageLines(raw, cfg.format), cfg.venue, year);
    } catch {
      return null;
    }
  }
  if (!entries) return null;
  const pageUrl = cfg.format === "wp-json" ? wpPageLink(raw) ?? url : url;
  return { url: pageUrl, hash: hashId(JSON.stringify(entries)), entries };
}

/** wp-json レスポンスから人間向けページ URL を取る (UI のリンク用)。 */
function wpPageLink(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const page = (Array.isArray(parsed) ? parsed[0] : parsed) as { link?: string } | undefined;
    return page?.link ?? null;
  } catch {
    return null;
  }
}
