import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllItems, getAllTags } from "@/lib/data";
import { EditorialItem } from "@/app/components/EditorialItem";

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ tag: encodeURIComponent(tag) }));
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const all = await getAllItems();
  const items = all
    .filter((it) => it.tags.includes(decoded))
    .sort((a, b) => (a.fetchedAt < b.fetchedAt ? 1 : -1));

  if (items.length === 0) notFound();

  // dedupe by id (an item can appear in multiple bundles otherwise)
  const seen = new Set<string>();
  const unique = items.filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });

  const nowMs = Date.now();

  return (
    <div className="page">
      <div className="page-inner">
        <header className="mast">
          <div className="mast-row">
            <div className="mast-brand">
              <Link href="/" className="mast-logo" aria-label="Daily Digest">
                <span className="mast-logo-glyph">◧</span>
              </Link>
              <div className="mast-brand-text">
                <div className="mast-title">Daily Digest</div>
                <div className="mast-tag">tag · #{decoded}</div>
              </div>
            </div>
            <nav className="mast-nav">
              <Link className="mast-nav-link" href="/">
                ホーム
              </Link>
              <Link className="mast-nav-link" href="/tags">
                タグ一覧
              </Link>
            </nav>
          </div>
        </header>
        <div className="tags-page">
          <h1 className="tags-page-title">#{decoded}</h1>
          <p className="tags-page-sub">{unique.length} 件 · 全アーカイブから</p>
          <div className="content">
            <section className="group">
              <div className="group-list">
                {unique.map((it, i) => (
                  <EditorialItem
                    key={it.id}
                    item={it}
                    index={i + 1}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
