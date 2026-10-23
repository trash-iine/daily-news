import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { VenueList, VenuePaper } from "@daily-news/shared";
import { DATA_DIR } from "../store.js";
import type { AcceptedEntry } from "./acceptedList.js";
import { MIN_TITLE_SIMILARITY, titleSimilarity } from "./titles.js";

/** 会議ごとの採択論文リスト。日次 bundle と同じく Actions がコミットする成果物。 */
export const VENUES_DIR = join(DATA_DIR, "venues");

export function venueSlug(venue: string, year: number): string {
  return `${venue.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${year}`;
}

export function newVenueList(venue: string, year: number, date: string): VenueList {
  return {
    slug: venueSlug(venue, year),
    venue,
    year,
    name: `${venue} ${year}`,
    createdOn: date,
    updatedAt: new Date().toISOString(),
    papers: [],
  };
}

export async function loadVenueLists(): Promise<Map<string, VenueList>> {
  const out = new Map<string, VenueList>();
  let files: string[];
  try {
    files = await readdir(VENUES_DIR);
  } catch {
    return out;
  }
  for (const f of files.filter((f) => f.endsWith(".json"))) {
    try {
      const list = JSON.parse(await readFile(join(VENUES_DIR, f), "utf-8")) as VenueList;
      out.set(list.slug, list);
    } catch {
      // 壊れたファイルは読み飛ばす (次回の書き込みで作り直される)
    }
  }
  return out;
}

export async function saveVenueList(list: VenueList): Promise<void> {
  await mkdir(VENUES_DIR, { recursive: true });
  list.updatedAt = new Date().toISOString();
  await writeFile(join(VENUES_DIR, `${list.slug}.json`), JSON.stringify(list, null, 2) + "\n", "utf-8");
}

/**
 * arXiv ID かタイトルで既存の論文を探す。採択リストと comments (arXiv 側のタイトル) の両方から
 * 来て表記が微妙に違うことがあるので、タイトルは完全一致ではなく類似度で見る。
 */
export function findVenuePaper(
  list: VenueList,
  q: { arxivId?: string; title: string },
): VenuePaper | undefined {
  return (
    list.papers.find((p) => q.arxivId !== undefined && p.arxivId === q.arxivId) ??
    list.papers.find((p) => titleSimilarity(p.title, q.title) >= MIN_TITLE_SIMILARITY)
  );
}

/**
 * 採択リストの内容を取り込む。既存 (comments 由来で先に入っていたものを含む) はそのまま残し、
 * 新しいタイトルだけを追加する。返り値は追加件数。
 */
export function mergeAcceptedEntries(list: VenueList, entries: AcceptedEntry[]): number {
  // 照合相手は取り込み前から居た論文だけ。同じリスト内の別論文 ("... Part I" / "... Part II") は
  // タイトルが似ていても別物なので、互いに重複扱いしない。
  const before: VenueList = { ...list, papers: [...list.papers] };
  let added = 0;
  for (const e of entries) {
    if (findVenuePaper(before, { title: e.title })) continue;
    list.papers.push({
      title: e.title,
      authors: e.authors,
      score: 0,
      matchedKeywords: [],
      via: "accepted-list",
    });
    added++;
  }
  return added;
}
