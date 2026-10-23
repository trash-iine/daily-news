import { XMLParser } from "fast-xml-parser";
import type { JournalConfig } from "../config.js";
import { cleanText, fetchText, toISOorNow } from "../util.js";
import { shortenAuthors } from "../sources/arxiv.js";

/** 論文誌 / ECCC の新着 1 件。会議採択論文と同じ「採択論文・論文誌」枠で競わせる。 */
export interface JournalPaper {
  title: string;
  authors: string[];
  /** 要約の入力にだけ使う。bundle には保存しない。 */
  abstract: string;
  url: string;
  /** 表示名 ("SIAM J. Comput." / "ECCC") */
  venue: string;
  /** bundle の source (`journal:sicomp` / `eccc`) */
  source: string;
  important: boolean;
  publishedAt: string;
}

interface CrossrefWork {
  DOI?: string;
  URL?: string;
  title?: string[];
  abstract?: string;
  author?: { given?: string; family?: string; name?: string }[];
  created?: { "date-time"?: string };
}

/** 正誤表・編集後記など、論文ではない DOI 登録を除く。 */
const NON_ARTICLE_TITLE =
  /^(correction|erratum|corrigendum|retraction|editorial|reviewer|note from the editor|front matter|back matter)/i;

export function parseCrossrefWorks(json: string, journal: JournalConfig): JournalPaper[] {
  const items = (JSON.parse(json) as { message?: { items?: CrossrefWork[] } }).message?.items ?? [];
  const out: JournalPaper[] = [];
  for (const it of items) {
    const title = cleanText((it.title ?? []).join(" "));
    if (!title || NON_ARTICLE_TITLE.test(title) || !it.DOI) continue;
    const authors = (it.author ?? [])
      .map((a) => a.name ?? [a.given, a.family].filter(Boolean).join(" "))
      .filter((n) => n.length > 0);
    out.push({
      title,
      authors: shortenAuthors(authors),
      // JATS の先頭に付く "Abstract." 見出しを落とす
      abstract: cleanText(it.abstract ?? "").replace(/^abstract\.?\s*/i, ""),
      url: it.URL ?? `https://doi.org/${it.DOI}`,
      venue: journal.name,
      source: `journal:${journal.id}`,
      important: journal.important ?? false,
      publishedAt: toISOorNow(it.created?.["date-time"]),
    });
  }
  return out;
}

export async function fetchCrossrefJournal(
  journal: JournalConfig,
  sinceDate: string,
): Promise<JournalPaper[]> {
  const params = new URLSearchParams({
    filter: `from-created-date:${sinceDate},type:journal-article`,
    rows: "100",
    select: "DOI,URL,title,abstract,author,created",
  });
  const url = `https://api.crossref.org/journals/${journal.issn}/works?${params}`;
  return parseCrossrefWorks(await fetchText(url), journal);
}

const rssParser = new XMLParser({ processEntities: true });

interface RssItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
}

/** ECCC の item title は "TR26-268 | タイトル | 著者, 著者" 形式。 */
export function parseEcccRss(xml: string, maxAgeDays: number, nowMs = Date.now()): JournalPaper[] {
  const doc = rssParser.parse(xml) as { rss?: { channel?: { item?: RssItem | RssItem[] } } };
  const raw = doc.rss?.channel?.item;
  const items = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  const cutoff = nowMs - maxAgeDays * 24 * 3600 * 1000;
  const out: JournalPaper[] = [];
  for (const it of items) {
    const publishedAt = toISOorNow(it.pubDate);
    if (Date.parse(publishedAt) < cutoff) continue;
    const parts = cleanText(String(it.title ?? "")).split("|").map((s) => s.trim());
    const title = parts[1] ?? parts[0] ?? "";
    if (!title || !it.link) continue;
    const authors = (parts[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    out.push({
      title,
      authors: shortenAuthors(authors),
      abstract: cleanText(String(it.description ?? "")),
      url: String(it.link),
      venue: "ECCC",
      source: "eccc",
      important: false,
      publishedAt,
    });
  }
  return out;
}

export async function fetchEccc(url: string, maxAgeDays: number): Promise<JournalPaper[]> {
  return parseEcccRss(await fetchText(url), maxAgeDays);
}
