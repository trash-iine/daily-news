import type { BaseItem } from "@daily-news/shared";

export function stripForPreview(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`+/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export const fmtRel = (iso: string, nowMs: number): string => {
  const d = new Date(iso).getTime();
  const h = Math.round((nowMs - d) / 36e5);
  if (h < 1) return "たった今";
  if (h < 24) return `${h}時間前`;
  return `${Math.round(h / 24)}日前`;
};

export const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

export const weekdayJa = (d: Date): string => WEEKDAY_JA[d.getDay()] ?? "";

export const fmtDateBadge = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${weekdayJa(d)}`;
};

export const hostFromUrl = (u: string): string => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/**
 * 論文の PDF URL を返す。
 * - arXiv: abs URL → pdf URL ("/abs/..." → "/pdf/....pdf")
 * - APS:   PDF 直リンクが取れないので null (abs ページのみ)
 * - news:  null
 */
export const pdfUrlOf = (it: BaseItem): string | null => {
  if (it.kind !== "paper") return null;
  if (it.source.startsWith("arxiv:")) {
    if (it.url.includes("/abs/")) {
      return `${it.url.replace("/abs/", "/pdf/")}.pdf`;
    }
  }
  return null;
};

/** 表示用の著者短縮。データに authors[] が無い場合は null。 */
export const displayAuthors = (it: BaseItem, max = 3): string[] | null => {
  if (it.kind !== "paper") return null;
  if (!it.authors || it.authors.length === 0) return null;
  if (it.authors.length <= max) return it.authors;
  return [...it.authors.slice(0, max), `+${it.authors.length - max}`];
};
