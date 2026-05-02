import Link from "next/link";
import { getAllItems, getAllTags } from "@/lib/data";
import { tagCatClass } from "@/lib/tag-category";

export default async function TagsIndex() {
  const tags = await getAllTags();
  const items = await getAllItems();
  const counts = new Map<string, number>();
  for (const it of items)
    for (const t of it.tags) counts.set(t, (counts.get(t) ?? 0) + 1);

  const sorted = [...tags].sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0),
  );

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
                <div className="mast-tag">tag index</div>
              </div>
            </div>
            <nav className="mast-nav">
              <Link className="mast-nav-link" href="/">
                ホーム
              </Link>
              <Link className="mast-nav-link is-active" href="/tags">
                タグ
              </Link>
            </nav>
          </div>
        </header>
        <div className="tags-page">
          <h1 className="tags-page-title">タグ</h1>
          <p className="tags-page-sub">{sorted.length} tags · 全アーカイブ</p>
          <div className="tags-grid">
            {sorted.map((t) => (
              <Link
                key={t}
                href={`/tags/${encodeURIComponent(t)}`}
                className={`chip ${tagCatClass(t)}`}
              >
                #{t}
                <span className="chip-count">{counts.get(t) ?? 0}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
