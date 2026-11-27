/**
 * 「続いている話題」の抽出。Today 画面の SeriesCard と、機械向けの `/latest.json` で共有する
 * (どちらも同じ判定で同じ話題を出すため、client component の外に置く)。
 */

import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import { BIG_TAG_GROUP_ORDER } from "@daily-news/shared";
import { dateRange, risingTags, type RisingTag } from "./trend";

export interface SeriesEntry {
  tag: string;
  bigGroup: BigTagGroup | null;
  ratio: number;
  /** 直近 N 日 (古い→新しい順)。それぞれの日の代表 item (なければ null)。 */
  days: { date: string; item: BaseItem | null }[];
  /** 今日の代表 item (jump 先)。 */
  todayItem: BaseItem;
}

/**
 * Today 画面で出すべき "続いている話題" を抽出する。
 *
 * 条件:
 * - 直近 7 日で出ているタグ
 * - 今日 (latestDate) にもそのタグの item がある (= jump 先がある)
 * - 過去 3 日のうち 2 日以上に出ている (連続性)
 * - big タグそのもの (ai / hobby など) は除外 (粒度が粗いので)
 *
 * ratio が大きい順に最大 2 件返す。
 */
export function detectSeries(
  bundles: Record<string, DailyBundle>,
  latestDate: string,
  todayItems: BaseItem[],
): SeriesEntry[] {
  const dates = dateRange(latestDate, 7);
  if (dates.length < 3) return [];

  // 今日のタグ集合 (jump 先の存在保証 + 「今もホット」のフィルタ)。
  // 「続いている話題」はニュース記事ベースで判定するため論文は数えない。
  const todayTags = new Set<string>();
  for (const it of todayItems) {
    if (it.kind === "paper") continue;
    for (const t of it.tags) todayTags.add(t);
  }

  // risingTags は「直近 N/2 日 vs それ以前」で比較するので、minRecent=2 だと
  // 今日 + 昨日に 1 件ずつ出ただけでも拾ってしまう。連続性を担保するため
  // 3 日以上で minRecent=2 を満たし、かつ今日に存在するものに絞る。
  const rising = risingTags(bundles, dates, {
    minRecent: 2,
    topN: 16,
    filter: (it) => it.kind !== "paper",
  });
  const candidates = rising.filter((r): r is RisingTag => {
    if (!todayTags.has(r.tag)) return false;
    // 大タググループ名と同名の canonical タグ (algorithm / game) は粒度が粗いので除外
    if ((BIG_TAG_GROUP_ORDER as readonly string[]).includes(r.tag)) return false;
    // 直近 3 日 (= series 末尾 3 要素) のうち 2 日以上に出現することを要求
    const last3 = r.series.slice(-3);
    const daysActive = last3.filter((c) => c > 0).length;
    return daysActive >= 2;
  });

  const out: SeriesEntry[] = [];
  for (const r of candidates) {
    const todayItem = pickRepresentative(todayItems, r.tag);
    if (!todayItem) continue;
    const days = dates.slice(-3).map((d) => ({
      date: d,
      item: pickRepresentative(bundles[d]?.items ?? [], r.tag),
    }));
    out.push({
      tag: r.tag,
      bigGroup: r.bigGroup,
      ratio: r.ratio,
      days,
      todayItem,
    });
    if (out.length >= 2) break;
  }
  return out;
}

/** タグを含むニュース記事のうち score 最大のものを返す (論文は代表にしない)。 */
function pickRepresentative(items: BaseItem[], tag: string): BaseItem | null {
  let best: BaseItem | null = null;
  for (const it of items) {
    if (it.kind === "paper") continue;
    if (!it.tags.includes(tag)) continue;
    if (!best || it.score > best.score) best = it;
  }
  return best;
}
