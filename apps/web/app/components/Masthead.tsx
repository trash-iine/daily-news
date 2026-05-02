import Link from "next/link";
import type { DailyBundle } from "@daily-news/shared";
import {
  FAMILY_GLYPH,
  FAMILY_LABELS,
  type SourceFamily,
  sourceFamily,
  sourceLabel,
} from "@/lib/source-family";
import { DateStepper } from "./DateStepper";
import { ThemeToggle } from "./ThemeToggle";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function Masthead({
  bundle,
  archive,
  currentDate,
}: {
  bundle: DailyBundle;
  archive: string[];
  currentDate: string;
}) {
  const date = new Date(bundle.date);
  const wd = WEEKDAYS[date.getDay()];
  const topItem = [...bundle.items].sort((a, b) => b.score - a.score)[0];

  const familyCountsMap = new Map<SourceFamily, number>();
  bundle.items.forEach((it) => {
    const f = sourceFamily(it.source);
    familyCountsMap.set(f, (familyCountsMap.get(f) ?? 0) + 1);
  });
  const familyCounts = [...familyCountsMap.entries()].sort(
    (a, b) => b[1] - a[1],
  );

  const papers = bundle.items.filter((i) => i.kind === "paper").length;
  const news = bundle.items.filter((i) => i.kind === "news").length;
  const top = bundle.items.length
    ? Math.max(...bundle.items.map((i) => i.score))
    : 0;

  return (
    <header className="mast">
      <div className="mast-row">
        <div className="mast-brand">
          <Link href="/" className="mast-logo" aria-label="Daily Digest">
            <span className="mast-logo-glyph">◧</span>
          </Link>
          <div className="mast-brand-text">
            <div className="mast-title">Daily Digest</div>
            <div className="mast-tag">personal news + papers</div>
          </div>
        </div>
        <nav className="mast-nav">
          <DateStepper archive={archive} currentDate={currentDate} />
          <Link className="mast-nav-link" href="/tags">
            タグ
          </Link>
          <ThemeToggle />
        </nav>
      </div>

      <div className="mast-hero">
        <div className="mast-date">
          <div className="mast-date-day">{date.getDate()}</div>
          <div className="mast-date-mo">
            <div className="mast-date-y">
              {date.getFullYear()} · {String(date.getMonth() + 1).padStart(2, "0")}
            </div>
            <div className="mast-date-wd">{wd}曜日</div>
          </div>
        </div>

        <div className="mast-lead">
          <div className="mast-lead-label">本日のトップ</div>
          {topItem && (
            <a
              className="mast-lead-title"
              href={topItem.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              {topItem.title}
            </a>
          )}
          <div className="mast-lead-meta">
            {topItem && (
              <>
                <span>{sourceLabel(topItem.source)}</span>
                <span className="ed-dot">·</span>
                <span>score {topItem.score}</span>
              </>
            )}
          </div>
        </div>

        <div className="mast-stats">
          <div className="mast-stat">
            <div className="mast-stat-num">{bundle.items.length}</div>
            <div className="mast-stat-lbl">items</div>
          </div>
          <div className="mast-stat">
            <div className="mast-stat-num">{papers}</div>
            <div className="mast-stat-lbl">papers</div>
          </div>
          <div className="mast-stat">
            <div className="mast-stat-num">{news}</div>
            <div className="mast-stat-lbl">news</div>
          </div>
          <div className="mast-stat">
            <div className="mast-stat-num">{top}</div>
            <div className="mast-stat-lbl">top</div>
          </div>
        </div>
      </div>

      <div className="mast-sources">
        {familyCounts.map(([f, n]) => (
          <span key={f} className={`mast-source-chip fam-${f}`}>
            <span className="mast-source-glyph">{FAMILY_GLYPH[f]}</span>
            <span className="mast-source-name">{FAMILY_LABELS[f]}</span>
            <span className="mast-source-count">{n}</span>
          </span>
        ))}
        <span className="mast-gen">
          generated{" "}
          {new Date(bundle.generatedAt).toLocaleString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
          })}{" "}
          JST
        </span>
      </div>
    </header>
  );
}
