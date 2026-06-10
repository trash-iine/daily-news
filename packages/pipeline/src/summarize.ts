import OpenAI from "openai";
import type { PaperSummaryStruct } from "@daily-news/shared";
import { OPENAI_MODEL } from "./config.js";

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export interface SummarizeResult {
  /**
   * 平文の日本語要約。struct がある場合は struct を結合した文を入れる
   * (旧 UI / API クライアント互換のため必ず値を持つ)。
   */
  summary: string;
  /** 構造化要約。OpenAI 呼び出し失敗 / JSON parse 失敗の場合は undefined。 */
  struct?: PaperSummaryStruct;
}

/**
 * 構造化プロンプト。GAS 版の要約方針 (平文・推測排除・専門用語の説明) は
 * note セクションに残しつつ、出力を 技術と問題/問題/手法/結果 の JSON に固定する。
 * topic は一覧でひと目で内容がつかめるよう「どの技術で何の問題を扱うか」を 1 文で。
 */
function buildPrompt(abstract: string): string {
  return `<paper_summary_request>
以下は arXiv に投稿された論文の英文 abstract です。日本語で要約してください。

<output_schema>
次の JSON スキーマで出力してください。

{
  "topic": "この論文が扱う技術と問題を簡潔に 1 文で (例: 「拡散モデル (画像生成手法) を用いた動画生成の高速化」)。一覧でひと目で内容がつかめるように。",
  "problem": "この論文が解こうとしている問題・課題 (1〜2 文)。背景を 1 文で補ってよい。",
  "method": "提案手法の核となるアイデアと、なぜそれが問題に効くのか (2〜3 文)。",
  "result": "得られた定量的な成果や評価結果 (1〜2 文)。具体的な数値があれば残す。"
}
</output_schema>

<note>
- 平文で出力してください (Markdown / 箇条書き禁止、各値内には改行を入れない)。
- 各値は短く保ち、合計 400 字以内を目安に収めてください。
- 論文に書かれていない推測は避けてください。
- 専門用語には括弧で短い説明を加えてください (例: TSP (巡回セールスマン問題))。
</note>

<abstract>
${abstract}
</abstract>
</paper_summary_request>`;
}

/** struct を旧 UI 用の平文 (1 ブロック) にフォールバック整形する。 */
function structToPlain(s: PaperSummaryStruct): string {
  const parts: string[] = [];
  if (s.topic) parts.push(`**技術と問題** ${s.topic}`);
  parts.push(`**問題** ${s.problem}`, `**手法** ${s.method}`, `**結果** ${s.result}`);
  return parts.join("\n\n");
}

function parseStruct(raw: string): PaperSummaryStruct | null {
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof j !== "object" || j === null) return null;
  const o = j as Record<string, unknown>;
  // problem / method / result は必須。1 つでも欠ければ struct 不成立 (summary に fallback)。
  const required = ["problem", "method", "result"] as const;
  const out: Partial<PaperSummaryStruct> = {};
  for (const k of required) {
    const v = o[k];
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    if (trimmed.length === 0) return null;
    out[k] = trimmed;
  }
  // topic は任意。string かつ非空なら採用、無ければ省略する。
  if (typeof o.topic === "string") {
    const t = o.topic.trim();
    if (t.length > 0) out.topic = t;
  }
  return out as PaperSummaryStruct;
}

/**
 * 論文 abstract を構造化要約する。OPENAI_API_KEY が無い、または呼び出し失敗の場合は
 * abstract 冒頭 240 字をそのまま summary として返し、struct は undefined のままにする。
 *
 * 返り値の summary は常に値を持つ (旧 UI / RSS / API 互換のため)。struct がある場合は
 * struct を平文化したものを入れる。
 */
export async function summarizePaper(
  title: string,
  abstract: string,
): Promise<SummarizeResult> {
  const fallback: SummarizeResult = {
    summary: abstract.replace(/\s+/g, " ").trim().slice(0, 240),
  };
  const openai = getClient();
  if (!openai) return fallback;

  try {
    const res = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: buildPrompt(abstract) }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    const raw = res.choices[0]?.message?.content?.trim() ?? "";
    const struct = parseStruct(raw);
    if (struct) {
      return { summary: structToPlain(struct), struct };
    }
    if (raw.length > 0) return { summary: raw };
    return fallback;
  } catch (err) {
    console.warn(`[summarize] failed for "${title}":`, err);
    return fallback;
  }
}
