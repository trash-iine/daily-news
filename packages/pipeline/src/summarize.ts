import OpenAI from "openai";
import { OPENAI_MODEL } from "./config.js";

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/**
 * GAS 版 summarizeAbstract のプロンプト構造を踏襲。
 * 平文・推測排除・専門用語の説明付加を指示する。
 */
function buildPrompt(abstract: string): string {
  return `<abstract_translation_request>
abstractタブ内は論文のアブストラクトです。日本語に翻訳してください。

<note>
- 平文で出力してください。
- 正確な翻訳を心がけ、論文に書かれていない推測は避けてください。
- タイトルは不要です。
- 読み手にわかりやすい文章構成を心がけ、論理的な流れを意識してください。
- 専門用語には説明を加えてください。
- 簡潔かつ明瞭な表現を使用してください。
</note>

<abstract>
${abstract}
</abstract>
</abstract_translation_request>`;
}

export async function summarizePaper(
  title: string,
  abstract: string,
): Promise<string> {
  const fallback = abstract.replace(/\s+/g, " ").trim().slice(0, 240);
  const openai = getClient();
  if (!openai) return fallback;

  try {
    const res = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: buildPrompt(abstract) }],
      temperature: 0.3,
    });
    const text = res.choices[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : fallback;
  } catch (err) {
    console.warn(`[summarize] failed for "${title}":`, err);
    return fallback;
  }
}
