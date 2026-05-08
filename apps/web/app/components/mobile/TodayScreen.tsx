"use client";
import { useMemo, useState } from "react";
import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import { BIG_TAGS, itemBigTags } from "./lib";
import { BigTagFilter, DateStrip } from "./atoms";
import { ArticleCard } from "./ArticleCard";

export function TodayScreen({
  archive,
  currentDate,
  setCurrentDate,
  bundle,
  saved,
  toggleSave,
  nowMs,
}: {
  archive: string[];
  currentDate: string | null;
  setCurrentDate: (d: string) => void;
  bundle: DailyBundle | null;
  saved: Set<string>;
  toggleSave: (id: string) => void;
  nowMs: number;
}) {
  const [bigFilter, setBigFilter] = useState<BigTagGroup | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = useMemo<Record<string, number>>(() => {
    const c: Record<string, number> = { all: bundle?.items.length || 0 };
    for (const t of BIG_TAGS) {
      c[t.id] = bundle?.items.filter((it) => itemBigTags(it).includes(t.id)).length || 0;
    }
    return c;
  }, [bundle]);

  const filtered: BaseItem[] = useMemo(() => {
    if (!bundle) return [];
    return bundle.items.filter((it) => {
      if (bigFilter && !itemBigTags(it).includes(bigFilter)) return false;
      return true;
    });
  }, [bundle, bigFilter]);

  const groups = useMemo(() => {
    const papers = filtered.filter((i) => i.kind === "paper");
    const news = filtered.filter((i) => i.kind === "news");
    return [
      papers.length && { key: "papers", label: "論文", sub: `${papers.length} 本`, items: papers },
      news.length && { key: "news", label: "ニュース", sub: `${news.length} 件`, items: news },
    ].filter(Boolean) as { key: string; label: string; sub: string; items: BaseItem[] }[];
  }, [filtered]);

  if (!bundle) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--fg-faint)" }}>読み込み中…</div>;
  }

  const date = new Date(bundle.date);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  const paperCount = bundle.items.filter((i) => i.kind === "paper").length;

  return (
    <>
      <div style={{ padding: "8px 18px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "var(--fg-faint)",
                textTransform: "uppercase",
              }}
            >
              {date.getFullYear()} · {String(date.getMonth() + 1).padStart(2, "0")}/
              {String(date.getDate()).padStart(2, "0")} ({wd})
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
              Daily Digest
            </h1>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-muted)",
              textAlign: "right",
            }}
          >
            <div>{bundle.items.length} items</div>
            <div style={{ fontSize: 10, color: "var(--fg-faint)" }}>
              {bundle.items.length - paperCount} N · {paperCount} P
            </div>
          </div>
        </div>
      </div>

      <DateStrip
        archive={archive}
        currentDate={currentDate}
        onChange={(d) => {
          setCurrentDate(d);
          setExpanded(null);
        }}
      />
      <BigTagFilter value={bigFilter} onChange={setBigFilter} counts={counts} />

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 8 }}>
        {groups.map((g) => (
          <section key={g.key}>
            <header
              style={{
                padding: "16px 18px 8px",
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 18,
                  fontWeight: 500,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                {g.label}
              </h2>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-faint)" }}>
                {g.sub}
              </span>
            </header>
            {g.items.map((it) => (
              <ArticleCard
                key={it.id}
                item={it}
                expanded={expanded === it.id}
                onToggle={() => setExpanded(expanded === it.id ? null : it.id)}
                saved={saved.has(it.id)}
                onSave={() => toggleSave(it.id)}
                nowMs={nowMs}
              />
            ))}
          </section>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>
            該当する記事はありません
          </div>
        )}
      </div>
    </>
  );
}
