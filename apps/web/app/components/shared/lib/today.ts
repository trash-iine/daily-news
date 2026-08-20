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
