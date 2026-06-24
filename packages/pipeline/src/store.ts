import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BaseItem, DailyBundle, DailyIndex, TrendingItem } from "@daily-news/shared";

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(here, "..", "..", "..", "data");

function dedupe(items: BaseItem[]): BaseItem[] {
  // Later occurrences win (callers pass the freshest run last).
  const map = new Map<string, BaseItem>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

export async function writeDaily(
  date: string,
  items: BaseItem[],
  trending?: TrendingItem[],
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const path = join(DATA_DIR, `${date}.json`);
  let merged = items;
  let existingTrending: TrendingItem[] | undefined;
  try {
    const existing = JSON.parse(await readFile(path, "utf-8")) as DailyBundle;
    merged = dedupe([...existing.items, ...items]);
    existingTrending = existing.trending;
  } catch {
    // file does not exist yet
  }
  // 同日 2 回目以降の実行で trending を未指定にされた場合は既存値を温存する
  // (テスト時や再実行で trending 取得をスキップしても過去スナップショットを壊さない)
  const nextTrending = trending ?? existingTrending;
  const bundle: DailyBundle = {
    date,
    generatedAt: new Date().toISOString(),
    items: merged.sort((a, b) => b.score - a.score),
    ...(nextTrending && nextTrending.length > 0 ? { trending: nextTrending } : {}),
  };
  await writeFile(path, JSON.stringify(bundle, null, 2) + "\n", "utf-8");
}

/**
 * 直近 daysBack 日の bundle から指定 kind の item id を集めて返す。
 * lookback を 24h から伸ばしたとき、過去日に既に上位入りした item が翌日以降の bundle に
 * 再掲されるのを防ぐため、main の rank 前にこの Set でフィルタする。
 * id は `hashId(url)` (SHA1[:16]) なので、生 URL からも `hashId` で照合できる。
 */
async function loadRecentIds(
  beforeDate: string,
  daysBack: number,
  kind: BaseItem["kind"],
): Promise<Set<string>> {
  const seen = new Set<string>();
  const indexPath = join(DATA_DIR, "index.json");
  let dates: string[] = [];
  try {
    const idx = JSON.parse(await readFile(indexPath, "utf-8")) as DailyIndex;
    dates = idx.dates;
  } catch {
    return seen;
  }
  const candidates = dates
    .filter((d) => d < beforeDate)
    .sort()
    .reverse()
    .slice(0, daysBack);
  for (const d of candidates) {
    try {
      const bundle = JSON.parse(
        await readFile(join(DATA_DIR, `${d}.json`), "utf-8"),
      ) as DailyBundle;
      for (const item of bundle.items) {
        if (item.kind === kind) seen.add(item.id);
      }
    } catch {
      // skip missing/broken file
    }
  }
  return seen;
}

/** 直近 daysBack 日の bundle に出た news の id 集合 (rankNews の cross-day dedup 用)。 */
export function loadRecentNewsIds(
  beforeDate: string,
  daysBack: number,
): Promise<Set<string>> {
  return loadRecentIds(beforeDate, daysBack, "news");
}

/** 直近 daysBack 日の bundle に出た paper の id 集合 (rankPapers の cross-day dedup 用)。 */
export function loadRecentPaperIds(
  beforeDate: string,
  daysBack: number,
): Promise<Set<string>> {
  return loadRecentIds(beforeDate, daysBack, "paper");
}

export async function updateIndex(date: string): Promise<void> {
  const path = join(DATA_DIR, "index.json");
  let dates: string[] = [];
  try {
    const existing = JSON.parse(await readFile(path, "utf-8")) as DailyIndex;
    dates = existing.dates;
  } catch {
    // first write
  }
  if (!dates.includes(date)) dates.push(date);
  dates.sort().reverse();
  const index: DailyIndex = { dates, updatedAt: new Date().toISOString() };
  await writeFile(path, JSON.stringify(index, null, 2) + "\n", "utf-8");
}
