/**
 * Today 画面まわりの、mobile / desktop 双方が使う型とカレンダー計算。
 * 表示コンポーネント (WeekStrip / WeekRail) は各レイヤー側に置く。
 */

export type TodayTab = "all" | "paper" | "news";

export interface WeekSlot {
  iso: string;
  date: number;
  inArchive: boolean;
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
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}`;
    const dayIdx = d.getUTCDay(); // 0=Sun..6=Sat
    const slotIdx = dayIdx === 0 ? 6 : dayIdx - 1; // Mon=0..Sun=6
    slots[slotIdx] = { iso, date: d.getUTCDate(), inArchive: archiveSet.has(iso) };
  }
  return slots.filter((s): s is WeekSlot => s !== null);
}
