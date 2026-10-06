import type { BaseItem, BigTagGroup } from "@daily-news/shared";
import { BIG_TAGS, itemBigTags } from "./bigTags";
import type { TodayTab } from "./today";

/**
 * 1 bundle 分の items を集計して、TodayTabs ヘッダーと BigTagFilter の両方で使う
 * 件数マップを返す。キーは "all" / "paper" / "news" と各 BIG_TAGS の id。
 */
export type BundleCounts = Record<TodayTab | BigTagGroup, number>;

export function bundleCounts(items: Pick<BaseItem, "kind" | "tags">[]): BundleCounts {
  const c = { all: items.length, paper: 0, news: 0 } as BundleCounts;
  for (const t of BIG_TAGS) c[t.id] = 0;
  for (const it of items) {
    c[it.kind]++;
    for (const g of itemBigTags(it)) c[g]++;
  }
  return c;
}

/** 評価バーのスケール下限。低スコアな日に全バーが満杯に見えるのを防ぐ。 */
const NEWS_SCORE_SCALE_MIN = 30;

/**
 * ニュースカード最下部の評価バーの分母。リスト内 news の最大 score (下限つき)。
 * フィルタ後ではなく bundle 全体から取ることで、タブ/大タグ切り替えでバー長が動かないようにする。
 */
export function newsScoreScale(items: BaseItem[]): number {
  const scores = items.filter((i) => i.kind === "news").map((i) => i.score);
  return Math.max(NEWS_SCORE_SCALE_MIN, ...scores);
}

/** Today の タブ (all/paper/news) + 大タグフィルタ。mobile の DayPanel と desktop の DesktopApp で共有。 */
export function filterDayItems(
  items: BaseItem[],
  tab: TodayTab,
  bigFilter: BigTagGroup | null,
): BaseItem[] {
  return items.filter(
    (it) =>
      (tab === "all" || it.kind === tab) &&
      (!bigFilter || itemBigTags(it).includes(bigFilter)),
  );
}
