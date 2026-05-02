"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function dateHref(date: string, latest: string): string {
  return date === latest ? "/" : `/d/${date}`;
}

export function DateStepper({
  archive,
  currentDate,
}: {
  archive: string[];
  currentDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const idx = archive.indexOf(currentDate);
  const latest = archive[0];
  const hasNewer = idx > 0;
  const hasOlder = idx >= 0 && idx < archive.length - 1;

  const goNewer = () => {
    const next = archive[idx - 1];
    if (hasNewer && next && latest) router.push(dateHref(next, latest));
  };
  const goOlder = () => {
    const prev = archive[idx + 1];
    if (hasOlder && prev && latest) router.push(dateHref(prev, latest));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goOlder();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNewer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, archive]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (archive.length === 0) return null;
  const d = new Date(currentDate);
  const wd = WEEKDAYS[d.getDay()];

  return (
    <div className="datestep" ref={ref}>
      <button
        className="datestep-btn"
        onClick={goOlder}
        disabled={!hasOlder}
        aria-label="前日へ"
        title="前日へ (←)"
      >
        ‹
      </button>
      <button
        className="datestep-current"
        onClick={() => setOpen((v) => !v)}
        aria-label="日付一覧を開く"
        aria-expanded={open}
      >
        <span className="datestep-md">
          {String(d.getMonth() + 1).padStart(2, "0")}/
          {String(d.getDate()).padStart(2, "0")}
        </span>
        <span className="datestep-wd">{wd}</span>
        <span className="datestep-caret">▾</span>
      </button>
      <button
        className="datestep-btn"
        onClick={goNewer}
        disabled={!hasNewer}
        aria-label="翌日へ"
        title="翌日へ (→)"
      >
        ›
      </button>
      {open && (
        <div className="datestep-pop" role="listbox">
          <div className="datestep-pop-head">
            <span>アーカイブ</span>
            <span className="datestep-pop-n">{archive.length} 日分</span>
          </div>
          <div className="datestep-pop-list">
            {archive.map((dd) => {
              const dt = new Date(dd);
              const w = WEEKDAYS[dt.getDay()];
              const active = dd === currentDate;
              return (
                <button
                  key={dd}
                  className={`datestep-pop-item ${active ? "is-active" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    if (!active && latest) router.push(dateHref(dd, latest));
                  }}
                >
                  <span className="dsi-date">
                    {dt.getFullYear()}.
                    {String(dt.getMonth() + 1).padStart(2, "0")}.
                    {String(dt.getDate()).padStart(2, "0")}
                  </span>
                  <span className="dsi-wd">{w}</span>
                  {active && <span className="dsi-tick">●</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
