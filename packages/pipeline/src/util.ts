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

export function cleanText(input: string): string {
  if (!input) return "";
  let s = input
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) =>
      String.fromCodePoint(parseInt(h as string, 16)),
    )
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d as string, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => NAMED_ENTITIES[n as string] ?? m);
  s = s.replace(/<[^>]+>/g, " ");
  return s.replace(/\s+/g, " ").trim();
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
