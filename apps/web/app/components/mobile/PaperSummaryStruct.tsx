"use client";
import type { PaperSummaryStruct } from "@daily-news/shared";

/**
 * 論文要約の構造化表示。問題 / 手法 / 結果 / 限界 の 4 ブロックを縦に並べる。
 *
 * - bundle に `summaryStruct` が無い旧データでは ArticleCard 側で SummaryMarkdown
 *   にフォールバックするので、このコンポーネントは struct があるときだけ呼ばれる。
 * - 各ブロックは左にカラーバー、上にラベル、下に本文。Markdown は不要 (LLM 側で
 *   箇条書きを禁止しているため必ず平文 1〜2 文)。LaTeX 数式が出る可能性は低いが、
 *   将来必要なら katex を内部で挿す。
 */
export function PaperSummaryStruct({ s }: { s: PaperSummaryStruct }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
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
      <Block
        label="限界"
        emoji="△"
        color="oklch(0.6 0.14 75)"
        body={s.limit}
        dim={isMissing(s.limit)}
      />
    </div>
  );
}

/**
 * limit が「abstract には記載なし」系の固定文言だったら少し沈める。
 * プロンプトで指定した文字列以外も含めて緩く判定する。
 */
function isMissing(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  return /記載なし|該当なし|言及なし|not stated/i.test(t);
}

function Block({
  label,
  emoji,
  color,
  body,
  dim,
}: {
  label: string;
  emoji: string;
  color: string;
  body: string;
  dim?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 9,
        background: "var(--bg-elev)",
        border: "0.5px solid var(--border)",
        borderLeft: `3px solid ${color}`,
        opacity: dim ? 0.7 : 1,
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
