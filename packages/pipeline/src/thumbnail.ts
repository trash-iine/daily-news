import { USER_AGENT } from "./util.js";

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;

const META_PATTERNS: RegExp[] = [
  /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
  /<meta[^>]+property=["']og:image:url["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+name=["']twitter:image:src["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/i,
];

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#x2F": "/",
  "#47": "/",
};

function decodeAttr(s: string): string {
  return s.replace(/&([a-zA-Z]+|#x?[0-9a-fA-F]+);/g, (m, name) => {
    const key = name as string;
    if (ENTITIES[key]) return ENTITIES[key];
    if (key.startsWith("#x") || key.startsWith("#X")) {
      return String.fromCodePoint(parseInt(key.slice(2), 16));
    }
    if (key.startsWith("#")) {
      return String.fromCodePoint(parseInt(key.slice(1), 10));
    }
    return m;
  });
}

export function extractOgImage(html: string, baseUrl: string): string | undefined {
  const head = html.slice(0, 64 * 1024);
  for (const re of META_PATTERNS) {
    const m = head.match(re);
    if (!m || !m[1]) continue;
    const raw = decodeAttr(m[1].trim());
    if (!raw) continue;
    try {
      return new URL(raw, baseUrl).href;
    } catch {
      // ignore unparseable URLs and try next pattern
    }
  }
  return undefined;
}

export async function fetchThumbnail(url: string): Promise<string | undefined> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch (err) {
    console.warn(`[thumbnail] fetch ${url} failed:`, (err as Error).message);
    return undefined;
  }
  if (!res.ok) {
    console.warn(`[thumbnail] fetch ${url} -> ${res.status}`);
    return undefined;
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("html") && !ct.includes("xml") && ct !== "") {
    return undefined;
  }

  const reader = res.body?.getReader();
  if (!reader) return undefined;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let html = "";
  let received = 0;
  try {
    while (received < MAX_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head\s*>/i.test(html)) break;
    }
    html += decoder.decode();
  } catch (err) {
    console.warn(`[thumbnail] read ${url} failed:`, (err as Error).message);
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
  }

  return extractOgImage(html, url);
}
