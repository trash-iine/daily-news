"use client";
import { useMemo, useState } from "react";
import type { BaseItem, DailyBundle } from "@daily-news/shared";
import { ArticleCard } from "./ArticleCard";

export function SavedScreen({
  allBundles,
  saved,
  toggleSave,
  nowMs,
}: {
  allBundles: Record<string, DailyBundle>;
  saved: Set<string>;
  toggleSave: (id: string) => void;
  nowMs: number;
}) {
  const items = useMemo(() => {
    const map = new Map<string, BaseItem>();
    for (const b of Object.values(allBundles)) {
      for (const it of b.items) {
        if (saved.has(it.id)) map.set(it.id, it);
      }
    }
    return [...map.values()].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }, [allBundles, saved]);

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <div style={{ padding: "8px 18px 18px" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--fg-faint)",
            textTransform: "uppercase",
          }}
        >
          {items.length} 件 保存済
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            margin: "2px 0 0",
            lineHeight: 1.1,
          }}
        >
          Saved
        </h1>
      </div>
      <div style={{ flex: 1, overflow: "auto", paddingBottom: 8 }}>
        {items.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>★</div>
            <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.6 }}>
              Today 画面で記事を開き、
              <br />
              「★ 保存」で全期間横断のキューに追加されます。
            </div>
          </div>
        ) : (
          items.map((it) => (
            <ArticleCard
              key={it.id}
              item={it}
              expanded={expanded === it.id}
              onToggle={() => setExpanded(expanded === it.id ? null : it.id)}
              saved={true}
              onSave={() => toggleSave(it.id)}
              nowMs={nowMs}
            />
          ))
        )}
      </div>
    </>
  );
}
