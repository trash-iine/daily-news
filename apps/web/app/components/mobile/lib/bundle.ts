import type { BaseItem } from "@daily-news/shared";
import { BIG_TAGS, itemBigTags } from "./bigTags";

/**
 * 1 bundle 分の items を集計して、TodayTabs ヘッダーと BigTagFilter の両方で使う
 * 件数マップを返す。キーは "all" / "paper" / "news" と各 BIG_TAGS の id。
 */
export function bundleCounts(items: BaseItem[]): Record<string, number> {
  const c: Record<string, number> = {
    all: items.length,
    paper: items.filter((i) => i.kind === "paper").length,
    news: items.filter((i) => i.kind === "news").length,
  };
  for (const t of BIG_TAGS) {
    c[t.id] = items.filter((it) => itemBigTags(it).includes(t.id)).length;
  }
  return c;
}
