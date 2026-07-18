import { createHash } from "node:crypto";

export const USER_AGENT =
  "daily-news-bot/0.1 (+https://github.com/trash-iine/daily-news)";

export function hashId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 16);
}

export function todayString(): string {
  // JST date for daily filename
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** 0x10FFFF 超などの不正な数値文字参照は fromCodePoint が throw するため、元の文字列を返す。 */
function codePointOr(match: string, code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return match;
  return String.fromCodePoint(code);
}

export function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => codePointOr(m, parseInt(h as string, 16)))
    .replace(/&#(\d+);/g, (m, d) => codePointOr(m, parseInt(d as string, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => NAMED_ENTITIES[n as string] ?? m);
}

export function cleanText(input: string): string {
  if (!input) return "";
  const decoded = decodeHtmlEntities(input);
  return decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** 与えられた日付文字列を ISO 8601 に正規化する。パース不能なら現在時刻にフォールバック。 */
export function toISOorNow(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return new Date().toISOString();
  return new Date(t).toISOString();
}

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "user-agent": USER_AGENT,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.text();
}
