import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BaseItem, DailyBundle, DailyIndex } from "@daily-news/shared";

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(here, "..", "..", "..", "data");

function dedupe(items: BaseItem[]): BaseItem[] {
  // Later occurrences win (callers pass the freshest run last).
  const map = new Map<string, BaseItem>();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

export async function writeDaily(date: string, items: BaseItem[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const path = join(DATA_DIR, `${date}.json`);
  let merged = items;
  try {
    const existing = JSON.parse(await readFile(path, "utf-8")) as DailyBundle;
    merged = dedupe([...existing.items, ...items]);
  } catch {
    // file does not exist yet
  }
  const bundle: DailyBundle = {
    date,
    generatedAt: new Date().toISOString(),
    items: merged.sort((a, b) => b.score - a.score),
  };
  await writeFile(path, JSON.stringify(bundle, null, 2) + "\n", "utf-8");
}

/**
 * 直近の過去 bundle から論文を取得する。
 * arXiv RSS は土日 (skipDays) に空配信となり、当日 0 件のことがあるため、
 * パイプライン側で直近の論文を引き継いで表示できるようにする。
 */
export async function loadRecentPapers(beforeDate: string): Promise<BaseItem[]> {
  const indexPath = join(DATA_DIR, "index.json");
  let dates: string[] = [];
  try {
    const idx = JSON.parse(await readFile(indexPath, "utf-8")) as DailyIndex;
    dates = idx.dates;
  } catch {
    return [];
  }
  const candidates = dates.filter((d) => d < beforeDate).sort().reverse();
  for (const d of candidates) {
    try {
      const bundle = JSON.parse(
        await readFile(join(DATA_DIR, `${d}.json`), "utf-8"),
      ) as DailyBundle;
      const papers = bundle.items.filter((i) => i.kind === "paper");
      if (papers.length > 0) return papers;
    } catch {
      // skip missing/broken file
    }
  }
  return [];
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
