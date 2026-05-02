"use client";

import { useMemo, useState } from "react";
import type { BaseItem, ItemKind } from "@daily-news/shared";
import { sourceLabel } from "@/lib/source-family";
import { tagCatClass } from "@/lib/tag-category";
import { EditorialItem } from "./EditorialItem";

type Group = {
  key: string;
  label: string;
  subtitle: string;
  items: BaseItem[];
};

function groupByKind(items: BaseItem[]): Group[] {
  const papers = items.filter((i) => i.kind === "paper");
  const news = items.filter((i) => i.kind === "news");
  return [
    {
      key: "papers",
      label: "論文",
      subtitle: `${papers.length} 本 · arXiv より厳選`,
      items: papers,
    },
    {
      key: "news",
      label: "ニュース",
      subtitle: `${news.length} 件 · 注目記事`,
      items: news,
    },
  ].filter((g) => g.items.length > 0);
}

export function SearchableList({
  items,
  nowMs,
}: {
  items: BaseItem[];
  nowMs: number;
}) {
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<ItemKind | null>(null);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => it.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((it) => {
      if (kindFilter && it.kind !== kindFilter) return false;
      if (tagFilter && !it.tags.includes(tagFilter)) return false;
      if (!qq) return true;
      return (
        it.title.toLowerCase().includes(qq) ||
        (it.summary || "").toLowerCase().includes(qq) ||
        it.tags.some((t) => t.toLowerCase().includes(qq)) ||
        sourceLabel(it.source).toLowerCase().includes(qq)
      );
    });
  }, [items, q, tagFilter, kindFilter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      paper: items.filter((i) => i.kind === "paper").length,
      news: items.filter((i) => i.kind === "news").length,
    }),
    [items],
  );

  const groups = useMemo(() => groupByKind(filtered), [filtered]);

  return (
    <>
      <div className="searchbar">
        <div className="searchbar-row">
          <div className="searchbar-input-wrap">
            <span className="searchbar-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="タイトル・要約・タグ・ソースから絞り込み"
              className="searchbar-input"
            />
            {q && (
              <button
                className="searchbar-clear"
                onClick={() => setQ("")}
                aria-label="clear"
              >
                ×
              </button>
            )}
          </div>
          <div className="kind-toggle">
            <button
              className={`kbtn ${kindFilter === null ? "is-active" : ""}`}
              onClick={() => setKindFilter(null)}
            >
              すべて<span className="kbtn-n">{counts.all}</span>
            </button>
            <button
              className={`kbtn ${kindFilter === "paper" ? "is-active" : ""}`}
              onClick={() => setKindFilter(kindFilter === "paper" ? null : "paper")}
            >
              論文<span className="kbtn-n">{counts.paper}</span>
            </button>
            <button
              className={`kbtn ${kindFilter === "news" ? "is-active" : ""}`}
              onClick={() => setKindFilter(kindFilter === "news" ? null : "news")}
            >
              ニュース<span className="kbtn-n">{counts.news}</span>
            </button>
          </div>
        </div>
        <div className="searchbar-tags">
          <button
            className={`chip chip-all ${tagFilter === null ? "is-active" : ""}`}
            onClick={() => setTagFilter(null)}
          >
            全タグ
          </button>
          {allTags.map(([t, n]) => (
            <button
              key={t}
              className={`chip ${tagCatClass(t)} ${tagFilter === t ? "is-active" : ""}`}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
            >
              #{t}
              <span className="chip-count">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="content">
        {groups.map((g) => (
          <section key={g.key} className="group">
            <header className="group-head">
              <div className="group-head-text">
                <h2 className="group-title">{g.label}</h2>
                <p className="group-sub">{g.subtitle}</p>
              </div>
              <div className="group-line" />
              <div className="group-count">{g.items.length}</div>
            </header>
            <div className="group-list">
              {g.items.map((it, i) => (
                <EditorialItem
                  key={it.id}
                  item={it}
                  index={i + 1}
                  nowMs={nowMs}
                />
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <div className="empty">該当する記事はありません。</div>
        )}
      </main>
    </>
  );
}
