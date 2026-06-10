"use client";
import type { PaperSummaryStruct } from "@daily-news/shared";

/**
 * 論文要約の構造化表示。先頭に「技術と問題」(扱う技術と問題の 1 文サマリ) を置き、続けて
 * 問題 / 手法 / 結果 の 3 ブロックを縦に並べる。
 *
 * - bundle に `summaryStruct` が無い旧データでは ArticleCard 側で SummaryMarkdown
 *   にフォールバックするので、このコンポーネントは struct があるときだけ呼ばれる。
 * - `topic` は 2026-06-11 以降の bundle にのみ付与されるので、無い旧 struct では
 *   リードを出さず 3 ブロックだけ表示する。
 * - 各ブロックは左にカラーバー、上にラベル、下に本文。Markdown は不要 (LLM 側で
 *   箇条書きを禁止しているため必ず平文 1〜2 文)。LaTeX 数式が出る可能性は低いが、
 *   将来必要なら katex を内部で挿す。
 */
export function PaperSummaryStruct({ s }: { s: PaperSummaryStruct }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {s.topic && <Lead body={s.topic} />}
      <Block
        label="問題"
        emoji="❓"
        color="oklch(0.6 0.14 25)"
        body={s.problem}
      />
      <Block
        label="手法"
        emoji="⚙"
        color="oklch(0.6 0.14 240)"
        body={s.method}
      />
      <Block
        label="結果"
        emoji="✓"
        color="oklch(0.6 0.16 145)"
        body={s.result}
      />
    </div>
  );
}

/**
 * 「技術と問題」リード。3 ブロックより一段目立たせ、一読で要点が伝わる導入にする。
 */
function Lead({ body }: { body: string }) {
  const color = "oklch(0.62 0.14 300)";
  return (
    <div
      style={{
        padding: "11px 13px",
        borderRadius: 9,
        background: `color-mix(in oklch, ${color} 8%, var(--bg-elev))`,
        border: `0.5px solid color-mix(in oklch, ${color} 30%, var(--border))`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 5,
        }}
      >
        <span style={{ fontSize: 11, color, lineHeight: 1 }}>🔍</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
            color,
          }}
        >
          技術と問題
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 15,
          lineHeight: 1.6,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: "var(--fg)",
          wordBreak: "break-word",
        }}
      >
        {body}
      </div>
    </div>
  );
}

function Block({
  label,
  emoji,
  color,
  body,
}: {
  label: string;
  emoji: string;
  color: string;
  body: string;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 9,
        background: "var(--bg-elev)",
        border: "0.5px solid var(--border)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 11, color, lineHeight: 1 }}>{emoji}</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
            color,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 13.5,
          lineHeight: 1.65,
          color: "var(--fg)",
          wordBreak: "break-word",
        }}
      >
        {body}
      </div>
    </div>
  );
}
