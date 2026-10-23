import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { VenuePaper } from "@daily-news/shared";
import { getVenueList, getVenueLists } from "@/lib/venues";
import { PaperSummaryStruct } from "@/app/components/shared/PaperSummaryStruct";

/** venue ファイルは data/ にコミットされたものだけなので、ビルド時に全部生成して残りは 404。 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const lists = await getVenueLists();
  return lists.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = await getVenueList(slug);
  return { title: `${list?.name ?? slug} · Daily Digest` };
}

/** 関連度順。同点なら arXiv 版があるもの (要約が読めるもの) を先に。 */
function byRelevance(a: VenuePaper, b: VenuePaper): number {
  return b.score - a.score || Number(!!b.arxivId) - Number(!!a.arxivId) || a.title.localeCompare(b.title);
}

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getVenueList(slug);
  if (!list) notFound();
  const papers = [...list.papers].sort(byRelevance);
  const onArxiv = papers.filter((p) => p.arxivId).length;

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "28px 16px 60px" }}>
      <a href="/venues" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>
        ← 採択論文
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
        {list.name}
      </h1>
      <p style={{ color: "var(--fg-muted)", fontSize: 12.5, margin: "0 0 18px", lineHeight: 1.6 }}>
        {papers.length} 本 · arXiv 版 {onArxiv} 本 ·{" "}
        {list.sourceUrl ? (
          <a href={list.sourceUrl} target="_blank" rel="noreferrer noopener" style={{ color: "var(--fg-muted)" }}>
            採択リスト
          </a>
        ) : (
          "arXiv の採択表記から収集"
        )}
        <br />
        関心キーワードとの関連度順。arXiv 版が未発見の論文は毎日照合し直しています。
      </p>

      <div style={{ display: "grid", gap: 6 }}>
        {papers.map((p) => (
          <PaperRow key={p.arxivId ?? p.title} p={p} />
        ))}
      </div>
    </main>
  );
}

function PaperRow({ p }: { p: VenuePaper }) {
  const url = p.arxivId ? `https://arxiv.org/abs/${p.arxivId}` : undefined;
  const meta = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        color: "var(--fg-faint)",
      }}
    >
      {p.score > 0 && <span>★{p.score}</span>}
      {p.matchedKeywords.map((t) => (
        <span key={t}>#{t}</span>
      ))}
      {!p.arxivId && <span>arXiv 未公開</span>}
      {p.arxivFoundOn && <span>arXiv 発見 {p.arxivFoundOn}</span>}
    </div>
  );
  const head = (
    <>
      <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.45 }}>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer noopener" style={{ color: "var(--fg)" }}>
            {p.title}
          </a>
        ) : (
          p.title
        )}
      </div>
      {p.authors.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{p.authors.join(", ")}</div>
      )}
      {meta}
    </>
  );
  const box = {
    padding: "11px 14px",
    borderRadius: 10,
    background: "var(--bg-elev)",
    border: "0.5px solid var(--border)",
  } as const;

  if (!p.summaryStruct) return <div style={box}>{head}</div>;
  return (
    <details style={box}>
      <summary style={{ cursor: "pointer", listStyle: "none" }}>
        {head}
        {p.summaryStruct.topic && (
          <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 6, lineHeight: 1.55 }}>
            {p.summaryStruct.topic}
          </div>
        )}
      </summary>
      <div style={{ marginTop: 10 }}>
        <PaperSummaryStruct s={p.summaryStruct} />
      </div>
    </details>
  );
}
