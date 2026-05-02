export const fmtTime = (iso: string, now: Date): string => {
  const d = new Date(iso);
  const diffH = Math.round((now.getTime() - d.getTime()) / 36e5);
  if (diffH < 1) return "たった今";
  if (diffH < 24) return `${diffH}時間前`;
  const days = Math.round(diffH / 24);
  return `${days}日前`;
};

export const fmtAbsTime = (iso: string): string =>
  new Date(iso).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

export const hostFromUrl = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
