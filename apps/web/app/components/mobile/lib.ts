import { BIG_TAG_GROUPS, type BaseItem, type BigTagGroup, type DailyBundle } from "@daily-news/shared";

export interface BigTagDef {
  id: BigTagGroup;
  label: string;
  color: string;
  emoji: string;
  desc: string;
}

export const BIG_TAGS: BigTagDef[] = [
  { id: "language",  label: "言語",         color: "oklch(0.58 0.15 230)", emoji: "</>", desc: "Rust / Python など言語・ランタイム" },
  { id: "ai",        label: "AI",           color: "oklch(0.6 0.16 295)",  emoji: "✦",   desc: "LLM・Claude・MCP・エージェント" },
  { id: "algorithm", label: "アルゴリズム", color: "oklch(0.6 0.14 75)",   emoji: "∑",   desc: "最適化・量子計算・理論" },
  { id: "hobby",     label: "趣味",         color: "oklch(0.6 0.14 320)",  emoji: "♥",   desc: "キーボード・数学・コーヒー" },
];

export const BIG_COLOR: Record<BigTagGroup, string> = Object.fromEntries(
  BIG_TAGS.map((t) => [t.id, t.color]),
) as Record<BigTagGroup, string>;

export const bigTagOf = (t: string): BigTagGroup | null => BIG_TAG_GROUPS[t] ?? null;

export const itemBigTags = (it: BaseItem): BigTagGroup[] => {
  const set = new Set<BigTagGroup>();
  for (const t of it.tags) {
    const g = bigTagOf(t);
    if (g) set.add(g);
  }
  return [...set];
};

export const FAM_COLOR: Record<string, string> = {
  zenn: "oklch(0.6 0.15 235)",
  qiita: "oklch(0.62 0.18 145)",
  arxiv: "oklch(0.55 0.18 25)",
  hn: "oklch(0.65 0.19 50)",
  rust: "oklch(0.58 0.18 35)",
  python: "oklch(0.58 0.15 230)",
  reddit: "oklch(0.65 0.21 20)",
  github: "oklch(0.5 0.04 270)",
  kbd: "oklch(0.58 0.16 300)",
  other: "oklch(0.55 0.02 60)",
};

export const FAM_GLYPH: Record<string, string> = {
  zenn: "Z",
  qiita: "Q",
  arxiv: "α",
  hn: "Y",
  rust: "R",
  python: "py",
  reddit: "r/",
  github: "gh",
  kbd: "⌨",
  other: "·",
};

const SOURCE_LABELS: Record<string, string> = {
  hn: "Hacker News",
  "hn:claude": "HN · Claude",
  "hn:anthropic": "HN · Anthropic",
  "hn:rust": "HN · Rust",
  "hn:python": "HN · Python",
  "hn:qmk": "HN · QMK",
  "hn:algorithm": "HN · Algorithm",
  "rss:zenn-all": "Zenn",
  "zenn-api:claude": "Zenn · Claude",
  "zenn-api:rust": "Zenn · Rust",
  "zenn-api:python": "Zenn · Python",
  "rss:qiita-popular": "Qiita",
  "qiita-api:claude": "Qiita · Claude",
  "qiita-api:rust": "Qiita · Rust",
  "qiita-api:python": "Qiita · Python",
  "rss:greenkeys": "Greenkeys",
  "rss:talpkeyboard": "TALPKEYBOARD",
  "rss:rust-blog": "Rust Blog",
  "rss:inside-rust": "Inside Rust",
  "rss:this-week-in-rust": "This Week in Rust",
  "rss:twir": "This Week in Rust",
  "rss:pep": "PEP RSS",
  "github-trending:rust": "GitHub · Rust",
  "reddit:Python": "Reddit · Python",
  "reddit:ClaudeAI": "Reddit · ClaudeAI",
  "arxiv:cs.DS": "arXiv · cs.DS",
  "arxiv:cs.CC": "arXiv · cs.CC",
  "arxiv:cs.AI": "arXiv · cs.AI",
  "arxiv:cs.LG": "arXiv · cs.LG",
  "arxiv:math.OC": "arXiv · math.OC",
  "arxiv:math.CO": "arXiv · math.CO",
  "arxiv:quant-ph": "arXiv · quant-ph",
};

export const sourceLabel = (s: string): string => SOURCE_LABELS[s] ?? s;

export const sourceFamily = (s: string): string => {
  if (s === "hn" || s.startsWith("hn:")) return "hn";
  if (s.startsWith("arxiv:")) return "arxiv";
  if (s.startsWith("rss:zenn") || s.startsWith("zenn-api:")) return "zenn";
  if (s.startsWith("rss:qiita") || s.startsWith("qiita-api:")) return "qiita";
  if (s.startsWith("reddit:")) return "reddit";
  if (s.startsWith("github-trending")) return "github";
  if (s.startsWith("rss:greenkeys") || s.startsWith("rss:talpkeyboard")) return "kbd";
  if (s === "rss:rust-blog" || s === "rss:inside-rust" || s === "rss:this-week-in-rust" || s === "rss:twir") return "rust";
  if (s === "rss:pep") return "python";
  return "other";
};

export const fmtRel = (iso: string, nowMs: number): string => {
  const d = new Date(iso).getTime();
  const h = Math.round((nowMs - d) / 36e5);
  if (h < 1) return "たった今";
  if (h < 24) return `${h}時間前`;
  return `${Math.round(h / 24)}日前`;
};

export const fmtDateBadge = (iso: string): string => {
  const d = new Date(iso);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} ${wd}`;
};

export const hostFromUrl = (u: string): string => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export type RecapPeriod = 7 | 14 | 30;

export const DELTA_UP = "oklch(0.62 0.15 150)";
export const DELTA_DOWN = "oklch(0.6 0.18 25)";

export function dateRange(latestDate: string, period: number): string[] {
  const out: string[] = [];
  const base = new Date(`${latestDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return out;
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out;
}

export function tagCountsByDate(
  bundles: Record<string, DailyBundle>,
  dates: string[],
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (!d) continue;
    for (const it of bundles[d]?.items ?? []) {
      for (const t of it.tags) {
        let arr = out[t];
        if (!arr) {
          arr = new Array<number>(dates.length).fill(0);
          out[t] = arr;
        }
        arr[i] = (arr[i] ?? 0) + 1;
      }
    }
  }
  return out;
}

export function bigTagCountsByDate(
  bundles: Record<string, DailyBundle>,
  dates: string[],
): Record<BigTagGroup, number[]> {
  const out: Record<BigTagGroup, number[]> = {
    language: new Array<number>(dates.length).fill(0),
    ai: new Array<number>(dates.length).fill(0),
    algorithm: new Array<number>(dates.length).fill(0),
    hobby: new Array<number>(dates.length).fill(0),
  };
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (!d) continue;
    for (const it of bundles[d]?.items ?? []) {
      for (const g of itemBigTags(it)) {
        out[g][i] = (out[g][i] ?? 0) + 1;
      }
    }
  }
  return out;
}

export function tagTotals(items: BaseItem[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    for (const t of it.tags) m.set(t, (m.get(t) ?? 0) + 1);
  }
  return m;
}

export interface RisingTag {
  tag: string;
  recent: number;
  prior: number;
  ratio: number;
  series: number[];
  bigGroup: BigTagGroup | null;
}

export function risingTags(
  bundles: Record<string, DailyBundle>,
  dates: string[],
  opts: { minRecent?: number; topN?: number } = {},
): RisingTag[] {
  const { minRecent = 2, topN = 6 } = opts;
  if (dates.length < 2) return [];
  const counts = tagCountsByDate(bundles, dates);
  const splitAt = Math.floor(dates.length / 2);
  const result: RisingTag[] = [];
  for (const [tag, series] of Object.entries(counts)) {
    const prior = series.slice(0, splitAt).reduce((a, b) => a + b, 0);
    const recent = series.slice(splitAt).reduce((a, b) => a + b, 0);
    if (recent < minRecent) continue;
    if (recent <= prior) continue;
    const ratio = (recent + 1) / (prior + 1);
    result.push({ tag, recent, prior, ratio, series, bigGroup: bigTagOf(tag) });
  }
  result.sort((a, b) => b.ratio - a.ratio || b.recent - a.recent);
  return result.slice(0, topN);
}

export interface TagFreqEntry {
  tag: string;
  count: number;
  prevCount: number;
  delta: number;
  isNew: boolean;
  bigGroup: BigTagGroup | null;
}

export function tagFrequency(
  bundles: Record<string, DailyBundle>,
  dates: string[],
  prevDates: string[],
  topN: number,
): TagFreqEntry[] {
  const sum = (ds: string[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const d of ds) {
      for (const it of bundles[d]?.items ?? []) {
        for (const t of it.tags) m.set(t, (m.get(t) ?? 0) + 1);
      }
    }
    return m;
  };
  const cur = sum(dates);
  const prev = sum(prevDates);
  const entries: TagFreqEntry[] = [];
  for (const [tag, count] of cur) {
    const prevCount = prev.get(tag) ?? 0;
    entries.push({
      tag,
      count,
      prevCount,
      delta: count - prevCount,
      isNew: prevCount === 0 && count > 0,
      bigGroup: bigTagOf(tag),
    });
  }
  entries.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return entries.slice(0, topN);
}
