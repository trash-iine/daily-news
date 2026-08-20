"use client";
import { ExternalLink } from "./ExternalLink";

/**
 * 論文の abs / PDF ボタン。ArticleCard では親の <button onClick={onToggle}> の中に
 * 置かれるので、click がトグルに吸われないよう stopPropagation する。
 */
export function PaperLinkButton({
  href,
  variant,
  label,
}: {
  href: string;
  variant: "abs" | "pdf";
  label: string;
}) {
  const isPdf = variant === "pdf";
  const base = isPdf ? "oklch(0.55 0.18 25)" : "oklch(0.58 0.13 50)";
  const fg = isPdf ? "oklch(0.5 0.18 25)" : "oklch(0.5 0.13 50)";
  return (
    <ExternalLink
      href={href}
      onClick={(e) => e.stopPropagation()}
      style={{
        padding: "2px 8px",
        borderRadius: 4,
        border: `0.5px solid color-mix(in oklch, ${base} 35%, transparent)`,
        color: `color-mix(in oklch, ${fg} 80%, var(--fg))`,
        background: `color-mix(in oklch, ${base} 10%, transparent)`,
        textDecoration: "none",
        fontSize: 10.5,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </ExternalLink>
  );
}
