import type { Metadata } from "next";
import { getVenueLists } from "@/lib/venues";

export const metadata: Metadata = { title: "Venues · Daily Digest" };

/** 会議ごとの採択論文リストの一覧。リスト本体は `/venues/[slug]`。 */
export default async function VenuesPage() {
  const lists = await getVenueLists();
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "28px 16px 60px" }}>
      <a href="/" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>
        ← Daily Digest
      </a>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          margin: "6px 0 4px",
        }}
      >
        採択論文
      </h1>
      <p style={{ color: "var(--fg-muted)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
        会議の採択リストと arXiv の採択表記から集めた論文。arXiv 版が見つかったものは日本語要約付き。
      </p>

      {lists.length === 0 && (
        <div style={{ padding: "40px 0", color: "var(--fg-faint)", fontSize: 13 }}>
          まだ採択論文のデータがありません。
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {lists.map((l) => {
          const onArxiv = l.papers.filter((p) => p.arxivId).length;
          return (
            <a
              key={l.slug}
              href={`/venues/${l.slug}`}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                background: "var(--bg-elev)",
                border: "0.5px solid var(--border)",
                color: "var(--fg)",
                textDecoration: "none",
              }}
            >
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500 }}>{l.name}</span>
              <span style={{ fontSize: 11.5, color: "var(--fg-faint)" }}>
                {l.sourceUrl ? "採択リスト" : "arXiv の採択表記から収集"}
                {l.gated && " · 関心キーワードで絞り込み"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-muted)",
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {l.papers.length} 本 · arXiv {onArxiv}
              </span>
            </a>
          );
        })}
      </div>
    </main>
  );
}
