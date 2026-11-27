/**
 * Today 画面まわりの、mobile / desktop 双方が使う型とカレンダー計算。
 * 表示コンポーネント (WeekStrip / WeekRail) は各レイヤー側に置く。
 */

import { isoDate } from "./trend";

export type TodayTab = "all" | "paper" | "news";

export interface WeekSlot {
  iso: string;
  date: number;
  inArchive: boolean;
  /**
   * 最新日より曜日順で後ろのスロット = 先週の日付。リングなので、たとえば最新日が火曜なら
   * 水〜日には先週の水〜日が入る。UI はこれを見て「先週」と分かる見た目にする。
   */
  lastWeek: boolean;
}

export const WEEKDAY_MON_SUN = ["月", "火", "水", "木", "金", "土", "日"] as const;

/**
 * Mon-Sun 固定 7 スロット。archive[0] (最新日) を末尾とする直近 7 日を
 * 各曜日スロットに配置するリングバッファ。archive に無い日は inArchive=false。
 */
export function buildWeekSlots(archive: string[]): WeekSlot[] {
  const anchor = archive[0];
  if (!anchor) return [];
  const archiveSet = new Set(archive);
  const slots: (WeekSlot | null)[] = new Array(7).fill(null);
  const base = new Date(`${anchor}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return [];
  const anchorSlotIdx = (base.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = isoDate(d);
    const slotIdx = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    slots[slotIdx] = {
      iso,
      date: d.getUTCDate(),
      inArchive: archiveSet.has(iso),
      lastWeek: slotIdx > anchorSlotIdx,
    };
  }
  return slots.filter((s): s is WeekSlot => s !== null);
}

/** 週の帯のボタンの title / aria-label。先週のスロットはそうと分かるようにする。 */
export function weekSlotLabel(slot: WeekSlot): string {
  return slot.lastWeek ? `先週 ${slot.iso}` : slot.iso;
}

/**
 * 週の帯のボタンの配色。先週のスロットは塗りを外して破線の枠にし、今週の日と見分けられるようにする。
 * mobile の WeekStrip と desktop の WeekRail で共有する。
 */
export function weekSlotSkin(
  slot: WeekSlot,
  active: boolean,
): { background: string; color: string; outline?: string; outlineOffset?: number } {
  if (active) return { background: "var(--fg)", color: "var(--bg)" };
  if (slot.lastWeek) {
    return {
      background: "transparent",
      color: "var(--fg-faint)",
      outline: "1px dashed var(--border)",
      outlineOffset: -1,
    };
  }
  return { background: "var(--bg-sunken)", color: "var(--fg-muted)" };
}

/**
 * Mon-Sun 固定リング上で currentDate の隣 (inArchive=true のみ) を返す。
 * dir=+1 は曜日順で次 (later), -1 は前 (earlier)。リングは archive[0] アンカー。
 *
 * mobile のスワイプ (DayCarousel) と desktop の ← → キー (DesktopApp) で共有する。
 * サーバから渡る bundle はこのリングと同じ直近 7 日の窓なので、日付移動をこの関数に
 * 通しておけば窓外に出て bundle が無い状態にならない。
 */
export function ringNeighbor(
  slots: WeekSlot[],
  currentDate: string,
  dir: -1 | 1,
): string | null {
  const n = slots.length;
  if (n === 0) return null;
  const idx = slots.findIndex((s) => s.iso === currentDate);
  if (idx < 0) return null;
  for (let step = 1; step <= n; step++) {
    const j = ((idx + dir * step) % n + n) % n;
    const slot = slots[j];
    if (slot && slot.inArchive && slot.iso !== currentDate) return slot.iso;
  }
  return null;
}
