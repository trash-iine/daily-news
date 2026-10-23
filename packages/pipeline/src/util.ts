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

/** HTML のギリシャ文字実体参照 (&alpha; … &omega; / &Alpha; … &Omega;)。会議の採択リストのタイトルに出る。 */
const GREEK = [
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu",
  "nu", "xi", "omicron", "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega",
];
const GREEK_ENTITIES: Record<string, string> = Object.fromEntries(
  GREEK.flatMap((name, i) => {
    // 小文字 α (U+03B1) は sigma の位置で終端形 ς (U+03C2) を挟むので、それ以降を 1 つずらす
    const lower = 0x3b1 + i + (i >= 17 ? 1 : 0);
    const upper = 0x391 + i + (i >= 17 ? 1 : 0);
    return [
      [name, String.fromCodePoint(lower)],
      [name[0]!.toUpperCase() + name.slice(1), String.fromCodePoint(upper)],
    ];
  }),
);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  times: "×",
  le: "≤",
  ge: "≥",
  ne: "≠",
  infin: "∞",
  sdot: "⋅",
  ...GREEK_ENTITIES,
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
