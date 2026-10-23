import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";
import type { VenueList } from "@daily-news/shared";

const VENUES_DIR = join(process.cwd(), "..", "..", "data", "venues");

/** `data/venues/*.json` (パイプラインが書く会議ごとの採択論文リスト) を新しい年 → 会議名順で返す。 */
export const getVenueLists = cache(async (): Promise<VenueList[]> => {
  let files: string[];
  try {
    files = await readdir(VENUES_DIR);
  } catch {
    return [];
  }
  const lists: VenueList[] = [];
  for (const f of files.filter((f) => f.endsWith(".json"))) {
    try {
      lists.push(JSON.parse(await readFile(join(VENUES_DIR, f), "utf-8")) as VenueList);
    } catch {
      // 壊れたファイルは一覧から外す
    }
  }
  return lists
    .filter((l) => l.papers.length > 0)
    .sort((a, b) => b.year - a.year || a.venue.localeCompare(b.venue));
});

export const getVenueList = cache(async (slug: string): Promise<VenueList | null> => {
  const lists = await getVenueLists();
  return lists.find((l) => l.slug === slug) ?? null;
});
