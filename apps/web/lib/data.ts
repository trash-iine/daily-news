import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { BaseItem, DailyBundle, DailyIndex } from "@daily-news/shared";

const DATA_DIR = join(process.cwd(), "..", "..", "data");

export async function getIndex(): Promise<DailyIndex> {
  try {
    const raw = await readFile(join(DATA_DIR, "index.json"), "utf-8");
    return JSON.parse(raw) as DailyIndex;
  } catch {
    // fall back to scanning directory
    try {
      const files = await readdir(DATA_DIR);
      const dates = files
        .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
        .map((f) => f.replace(/\.json$/, ""))
        .sort()
        .reverse();
      return { dates, updatedAt: new Date().toISOString() };
    } catch {
      return { dates: [], updatedAt: new Date().toISOString() };
    }
  }
}

export async function getDaily(date: string): Promise<DailyBundle | null> {
  try {
    const raw = await readFile(join(DATA_DIR, `${date}.json`), "utf-8");
    return JSON.parse(raw) as DailyBundle;
  } catch {
    return null;
  }
}

export async function getLatest(): Promise<DailyBundle | null> {
  const idx = await getIndex();
  const latest = idx.dates[0];
  return latest ? getDaily(latest) : null;
}

export async function getAllItems(): Promise<BaseItem[]> {
  const idx = await getIndex();
  const bundles = await Promise.all(idx.dates.map((d) => getDaily(d)));
  return bundles.flatMap((b) => b?.items ?? []);
}

export async function getAllTags(): Promise<string[]> {
  const items = await getAllItems();
  const set = new Set<string>();
  for (const it of items) for (const t of it.tags) set.add(t);
  return [...set].sort();
}
