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
