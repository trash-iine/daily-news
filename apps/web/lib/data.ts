import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { DailyBundle, DailyIndex } from "@daily-news/shared";

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

async function readBundle(date: string): Promise<DailyBundle | null> {
  try {
    const raw = await readFile(join(DATA_DIR, `${date}.json`), "utf-8");
    return JSON.parse(raw) as DailyBundle;
  } catch {
    return null;
  }
}

export async function getAllBundles(): Promise<Record<string, DailyBundle>> {
  const idx = await getIndex();
  const entries = await Promise.all(
    idx.dates.map(async (d) => [d, await readBundle(d)] as const),
  );
  const out: Record<string, DailyBundle> = {};
  for (const [d, b] of entries) if (b) out[d] = b;
  return out;
}
