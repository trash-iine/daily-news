import type { BaseItem, VenueList, VenuePaper } from "@daily-news/shared";
import {
  ECCC_FEED_URL,
  ECCC_MAX_AGE_DAYS,
  JOURNALS,
  JOURNAL_LOOKBACK_DAYS,
  PAPER_SCORE_THRESHOLD,
  VENUE_ACCEPTED_LISTS,
  VENUE_COMMENT_GROUP_SIZE,
  VENUE_COMMENT_LOOKBACK_DAYS,
  VENUE_COMMENT_VENUES,
  type CommentVenueConfig,
  VENUE_MATCH_WINDOW_DAYS,
  VENUE_PAPERS_TOP_N,
  VENUE_RECHECK_DAILY_DAYS,
  VENUE_RECHECK_INTERVAL_DAYS,
  VENUE_SUMMARIZE_MAX_PER_RUN,
} from "../config.js";
import { isQuantumPaper } from "../paperFinalists.js";
import { paperRelevance, paperTags } from "../ranking.js";
import {
  fetchArxivByComment,
  fetchArxivByIds,
  shortenAuthors,
  type ArxivPaper,
} from "../sources/arxiv.js";
import { summarizePaper } from "../summarize.js";
import { hashId } from "../util.js";
import { fetchAcceptedList } from "./acceptedList.js";
import { matchVenueComment } from "./arxivComments.js";
import { passesVenueGate, venueGateTerms } from "./gate.js";
import { fetchCrossrefJournal, fetchEccc, type JournalPaper } from "./journals.js";
import { pickMatcher, type MatchResult } from "./match.js";
import {
  findVenuePaper,
  loadVenueLists,
  mergeAcceptedEntries,
  newVenueList,
  saveVenueList,
  venueSlug,
} from "./store.js";

// arXiv API ToU: 3 秒に 1 リクエスト、同時接続 1。collectPapers の後に逐次で呼ぶ前提。
const ARXIV_INTERVAL_MS = 3000;
// 採択リストのページは同じホストに 10 秒以上空けて取る (focs.computer.org の Crawl-delay: 10)。
const ACCEPTED_LIST_HOST_INTERVAL_MS = 10_000;
// Crossref の public pool は一覧系クエリが 1 req/s・同時 1 本 (x-concurrency-limit: 1)。逐次 + 間隔を空ける。
const CROSSREF_INTERVAL_MS = 1100;
// 照合先が落ちている日に大量のエラーを積まないよう、連続失敗で照合を打ち切る。
const MATCH_MAX_CONSECUTIVE_FAILURES = 5;
const ARXIV_ID_BATCH = 50;
const SUMMARIZE_CONCURRENCY = 8;
const DAY_MS = 24 * 3600 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stripVersion = (id: string) => id.replace(/v\d+$/, "");

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** 「採択論文・論文誌」枠の候補。会議採択論文と論文誌新着を同じ基準で並べる。 */
interface Candidate {
  item: BaseItem;
  important: boolean;
  /** 要約がまだ無い候補 (論文誌) の要約入力。会議採択論文は venue ファイル側で要約済み。 */
  abstract?: string;
}

async function mapLimit<T, R>(xs: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(xs.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, xs.length) }, async () => {
    while (next < xs.length) {
      const i = next++;
      out[i] = await fn(xs[i] as T);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * 会議採択論文と論文誌の新着を集め、`data/venues/*.json` を更新し、
 * Today の「採択論文・論文誌」枠に載せる item を返す。
 *
 * 会議採択論文が Today に出るのは「arXiv 版が初めて見つかった日」。採択リスト公開日には
 * 既に arXiv にある論文が一度に見つかるので、関連度上位だけが Today に出て、残りは
 * 会議別ページ (/venues/{slug}) で見る。
 */
export async function collectVenueItems(
  date: string,
  seenPaperIds: Set<string>,
): Promise<BaseItem[]> {
  const lists = await loadVenueLists();
  const dirty = new Set<string>();
  const touch = (l: VenueList) => dirty.add(l.slug);
  const meta = new Map<string, ArxivPaper>();
  const thisYear = Number(date.slice(0, 4));
  const years = [thisYear, thisYear + 1];

  const getList = (venue: string, year: number): VenueList => {
    const slug = venueSlug(venue, year);
    let l = lists.get(slug);
    if (!l) {
      l = newVenueList(venue, year, date);
      lists.set(slug, l);
    }
    return l;
  };

  // 1) 採択リストページ。未公開の年は null が返るだけなので毎日叩いて公開を検知する。
  //    取得済みで refetchDays がある会議 (1 MB 前後ある ML 会議の一覧) は間隔を空ける。
  const lastHit = new Map<string, number>();
  for (const cfg of VENUE_ACCEPTED_LISTS) {
    for (const year of years) {
      const existing = lists.get(venueSlug(cfg.venue, year));
      if (
        cfg.refetchDays &&
        existing?.sourceCheckedOn &&
        daysBetween(existing.sourceCheckedOn, date) < cfg.refetchDays
      ) {
        continue;
      }
      // 同じホストへの連続アクセスは robots.txt の Crawl-delay (focs.computer.org: 10) 以上空ける
      const host = new URL(cfg.urlTemplate.replaceAll("{year}", String(year))).host;
      const wait = (lastHit.get(host) ?? 0) + ACCEPTED_LIST_HOST_INTERVAL_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastHit.set(host, Date.now());
      const page = await fetchAcceptedList(cfg, year);
      if (!page) continue;
      const list = getList(cfg.venue, year);
      if (cfg.refetchDays) {
        list.sourceCheckedOn = date;
        touch(list);
      }
      if (list.sourceHash === page.hash) continue;
      const entries = cfg.gated ? page.entries.filter((e) => passesVenueGate(e.title)) : page.entries;
      const added = mergeAcceptedEntries(list, entries);
      list.sourceUrl = page.url;
      list.sourceHash = page.hash;
      if (cfg.gated) {
        list.gated = true;
        list.sourceTotal = page.entries.length;
      }
      touch(list);
      console.log(
        `[venues] ${list.name}: accepted list has ${page.entries.length} papers` +
          `${cfg.gated ? ` (${entries.length} match interests)` : ""} (+${added} new)`,
      );
    }
  }

  // 2) arXiv comments の採択表記。リストが取れない会議の補完と、リスト公開前の早期検知。
  //    会議を数件ずつ OR でまとめて 1 クエリにする。gated な会議は関心語との AND で検索する。
  const sinceMs = Date.now() - VENUE_COMMENT_LOOKBACK_DAYS * DAY_MS;
  const groups: CommentVenueConfig[][] = [];
  for (const gated of [false, true]) {
    const vs = VENUE_COMMENT_VENUES.filter((v) => !!v.gated === gated);
    for (let i = 0; i < vs.length; i += VENUE_COMMENT_GROUP_SIZE) {
      groups.push(vs.slice(i, i + VENUE_COMMENT_GROUP_SIZE));
    }
  }
  for (const group of groups) {
    const gated = !!group[0]?.gated;
    const names = group.map((v) => v.venue);
    await sleep(ARXIV_INTERVAL_MS);
    let papers: ArxivPaper[];
    try {
      papers = await fetchArxivByComment(names, years, sinceMs, gated ? venueGateTerms() : []);
    } catch (err) {
      console.warn(`[venues] arxiv comments ${names.join("/")} failed:`, (err as Error).message);
      continue;
    }
    for (const p of papers) {
      let venue: string | undefined;
      let year: number | null = null;
      for (const name of names) {
        year = matchVenueComment(p.comment, name, years);
        if (year !== null) {
          venue = name;
          break;
        }
      }
      if (venue === undefined || year === null) continue;
      if (gated && !passesVenueGate(p.title)) continue;
      const id = stripVersion(p.arxivId);
      const list = getList(venue, year);
      if (gated) list.gated = true;
      const existing = findVenuePaper(list, { arxivId: id, title: p.title });
      if (existing?.arxivId) continue;
      meta.set(id, p);
      if (existing) {
        existing.arxivId = id;
        existing.arxivFoundOn = date;
      } else {
        list.papers.push({
          title: p.title,
          authors: p.authors,
          arxivId: id,
          arxivFoundOn: date,
          score: 0,
          matchedKeywords: [],
          via: "arxiv-comment",
        });
      }
      touch(list);
    }
  }

  // arXiv 版が未発見の論文はタイトルだけで仮採点しておく (照合の優先順と会議別ページの並び順に使う)
  for (const list of lists.values()) {
    for (const paper of list.papers) {
      if (paper.arxivId) continue;
      const r = paperRelevance(paper.title, "");
      paper.score = r.score;
      paper.matchedKeywords = paperTags(r.matched, false);
    }
  }

  // 3) 採択リストのうち arXiv 版が未発見の論文を照合する。未照合 → 関連度の高い順に、件数上限まで。
  const matcher = pickMatcher();
  const due = (list: VenueList, paper: VenuePaper): boolean => {
    if (paper.arxivId) return false;
    if (!paper.lastCheckedOn) return true;
    const interval =
      daysBetween(list.createdOn, date) <= VENUE_RECHECK_DAILY_DAYS ? 1 : VENUE_RECHECK_INTERVAL_DAYS;
    return daysBetween(paper.lastCheckedOn, date) >= interval;
  };
  const queue = [...lists.values()]
    .filter((l) => daysBetween(l.createdOn, date) <= VENUE_MATCH_WINDOW_DAYS)
    .flatMap((list) => list.papers.filter((p) => due(list, p)).map((paper) => ({ list, paper })))
    .sort(
      (a, b) =>
        Number(!b.paper.lastCheckedOn) - Number(!a.paper.lastCheckedOn) ||
        b.paper.score - a.paper.score,
    )
    .slice(0, matcher.maxPerRun);
  let failures = 0;
  let matched = 0;
  for (const { list, paper } of queue) {
    if (failures >= MATCH_MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[venues] ${matcher.name}: too many consecutive failures; stop matching for today`);
      break;
    }
    await sleep(matcher.intervalMs);
    let r: MatchResult | null;
    try {
      r = await matcher.find(paper.title, paper.authors);
      failures = 0;
    } catch (err) {
      failures++;
      console.warn(`[venues] ${matcher.name} failed for "${paper.title}":`, (err as Error).message);
      continue;
    }
    paper.lastCheckedOn = date;
    touch(list);
    if (r && !list.papers.some((q) => q.arxivId === r.arxivId)) {
      paper.arxivId = r.arxivId;
      paper.arxivFoundOn = date;
      if (r.paper) meta.set(r.arxivId, r.paper);
      matched++;
    }
  }
  console.log(
    `[venues] ${matcher.name}: checked ${queue.length} accepted papers, matched ${matched} to arXiv`,
  );

  // 4) 今日見つかった論文と、要約待ちの論文の arXiv メタ (abstract) を取る。
  const all: { list: VenueList; paper: VenuePaper }[] = [];
  for (const list of lists.values()) for (const paper of list.papers) all.push({ list, paper });
  const foundToday = all.filter(({ paper }) => paper.arxivFoundOn === date);
  const toSummarize = all
    .filter(({ paper }) => paper.arxivId && !paper.summaryStruct)
    .sort(
      (a, b) =>
        Number(b.paper.arxivFoundOn === date) - Number(a.paper.arxivFoundOn === date) ||
        b.paper.score - a.paper.score,
    )
    .slice(0, VENUE_SUMMARIZE_MAX_PER_RUN);
  const missing = [
    ...new Set(
      [...foundToday, ...toSummarize]
        .map(({ paper }) => paper.arxivId as string)
        .filter((id) => id && !meta.has(id)),
    ),
  ];
  for (let i = 0; i < missing.length; i += ARXIV_ID_BATCH) {
    await sleep(ARXIV_INTERVAL_MS);
    try {
      for (const p of await fetchArxivByIds(missing.slice(i, i + ARXIV_ID_BATCH))) {
        meta.set(stripVersion(p.arxivId), p);
      }
    } catch (err) {
      console.warn(`[venues] arxiv id_list failed:`, (err as Error).message);
    }
  }

  // 5) 採点。abstract があればタイトル + abstract、無ければタイトルだけで仮採点する。
  for (const { list, paper } of all) {
    const m = paper.arxivId ? meta.get(paper.arxivId) : undefined;
    if (paper.arxivId && !m) continue; // arXiv 版はあるが今回メタを取っていない: 前回の採点を保つ
    const abstract = m?.abstract ?? "";
    const r = paperRelevance(paper.title, abstract);
    const tags = paperTags(r.matched, isQuantumPaper({ source: "", title: paper.title, abstract }));
    if (paper.score !== r.score || paper.matchedKeywords.join() !== tags.join()) {
      paper.score = r.score;
      paper.matchedKeywords = tags;
      touch(list);
    }
    if (m && paper.authors.length === 0) paper.authors = m.authors;
  }

  // 6) 要約。OpenAI キーが無いと struct が返らないので保存せず、次回に持ち越す。
  const summarizable = toSummarize.filter(({ paper }) => meta.has(paper.arxivId as string));
  await mapLimit(summarizable, SUMMARIZE_CONCURRENCY, async ({ list, paper }) => {
    const m = meta.get(paper.arxivId as string) as ArxivPaper;
    const r = await summarizePaper(paper.title, m.abstract);
    if (!r.struct) return;
    paper.summary = r.summary;
    paper.summaryStruct = r.struct;
    touch(list);
  });

  const fetchedAt = new Date().toISOString();
  const candidates: Candidate[] = foundToday
    .filter(({ paper }) => paper.arxivId)
    .map(({ list, paper }) => {
      const absUrl = `https://arxiv.org/abs/${paper.arxivId}`;
      return {
        important: true,
        // 要約上限 (VENUE_SUMMARIZE_MAX_PER_RUN) から漏れたまま選抜された場合の要約入力
        abstract: meta.get(paper.arxivId as string)?.abstract,
        item: {
          // 同じ論文が通常の arXiv 新着にも出た日に id が衝突しないよう slug を混ぜる
          id: hashId(`${absUrl}#${list.slug}`),
          kind: "paper",
          title: paper.title,
          url: absUrl,
          summary: paper.summary ?? "",
          ...(paper.summaryStruct ? { summaryStruct: paper.summaryStruct } : {}),
          tags: paper.matchedKeywords,
          score: paper.score,
          popularity: 0,
          keywordScore: paper.score,
          languageBonus: 0,
          matchedKeywords: paper.matchedKeywords,
          source: `venue:${list.slug}`,
          venue: list.name,
          venueSlug: list.slug,
          publishedAt: fetchedAt,
          fetchedAt,
          ...(paper.authors.length > 0 ? { authors: shortenAuthors(paper.authors) } : {}),
        },
      };
    });

  // 7) 論文誌 (Crossref) と ECCC。
  const sinceDate = new Date(Date.now() - JOURNAL_LOOKBACK_DAYS * DAY_MS).toISOString().slice(0, 10);
  const journalPapers: JournalPaper[] = [];
  for (const j of JOURNALS) {
    await sleep(CROSSREF_INTERVAL_MS);
    try {
      journalPapers.push(...(await fetchCrossrefJournal(j, sinceDate)));
    } catch (err) {
      console.warn(`[venues] crossref ${j.id} failed:`, (err as Error).message);
    }
  }
  try {
    journalPapers.push(...(await fetchEccc(ECCC_FEED_URL, ECCC_MAX_AGE_DAYS)));
  } catch (err) {
    console.warn(`[venues] eccc failed:`, (err as Error).message);
  }
  for (const jp of journalPapers) {
    const r = paperRelevance(jp.title, jp.abstract);
    const tags = paperTags(r.matched, isQuantumPaper({ source: "", title: jp.title, abstract: jp.abstract }));
    candidates.push({
      important: jp.important,
      abstract: jp.abstract,
      item: {
        id: hashId(jp.url),
        kind: "paper",
        title: jp.title,
        url: jp.url,
        summary: "",
        tags,
        score: r.score,
        popularity: 0,
        keywordScore: r.score,
        languageBonus: 0,
        matchedKeywords: tags,
        source: jp.source,
        venue: jp.venue,
        publishedAt: jp.publishedAt,
        fetchedAt,
        ...(jp.authors.length > 0 ? { authors: jp.authors } : {}),
      },
    });
  }

  // 8) 枠の選抜: キーワード関連度順。important (会議採択論文 / トップ誌) は閾値未満でも候補に残す。
  const seenUrl = new Set<string>();
  const selected = candidates
    .filter((c) => !seenPaperIds.has(c.item.id))
    .filter((c) => c.important || c.item.score >= PAPER_SCORE_THRESHOLD)
    .sort((a, b) => b.item.score - a.item.score || Number(b.important) - Number(a.important))
    .filter((c) => {
      if (seenUrl.has(c.item.url)) return false;
      seenUrl.add(c.item.url);
      return true;
    })
    .slice(0, VENUE_PAPERS_TOP_N);

  await Promise.all(
    selected.map(async (c) => {
      if (c.item.summaryStruct || !c.abstract) return;
      const r = await summarizePaper(c.item.title, c.abstract);
      c.item.summary = r.summary;
      if (r.struct) c.item.summaryStruct = r.struct;
    }),
  );

  for (const slug of dirty) await saveVenueList(lists.get(slug) as VenueList);
  console.log(
    `[venues] ${foundToday.length} venue papers found on arXiv today, ${journalPapers.length} journal papers; ` +
      `selected ${selected.length}; saved ${dirty.size} venue lists`,
  );
  return selected.map((c) => c.item);
}
