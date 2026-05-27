import type { BaseItem } from "@daily-news/shared";
import { fetchThumbnail } from "./thumbnail.js";

const THUMBNAIL_CONCURRENCY = 8;

/**
 * 各 item の URL を Open Graph スクレイプして thumbnail を埋める。
 * 単一スレッド JS で cursor++ は await まで yield しないので worker pool が
 * 同じ index を競合することはない (各 worker が一意の i を取る)。
 */
export async function enrichWithThumbnails(items: BaseItem[]): Promise<BaseItem[]> {
  const results = items.slice();
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(THUMBNAIL_CONCURRENCY, items.length) },
    async () => {
      while (true) {
        const i = cursor++;
        const item = results[i];
        if (!item) return;
        const thumbnail = await fetchThumbnail(item.url);
        if (thumbnail) results[i] = { ...item, thumbnail };
      }
    },
  );
  await Promise.all(workers);
  return results;
}
