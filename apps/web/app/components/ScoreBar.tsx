import type { ItemKind } from "@daily-news/shared";

export function ScoreBar({
  score,
  max = 18,
  kind,
}: {
  score: number;
  max?: number;
  kind: ItemKind;
}) {
  const pct = Math.min(1, score / max);
  const color = kind === "paper" ? "var(--accent-paper)" : "var(--accent-news)";
  return (
    <div className="score-bar" title={`score ${score}`}>
      <div
        className="score-bar-fill"
        style={{ width: `${pct * 100}%`, background: color }}
      />
    </div>
  );
}
