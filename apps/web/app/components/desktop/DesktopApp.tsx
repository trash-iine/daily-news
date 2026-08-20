"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BaseItem, BigTagGroup, DailyBundle } from "@daily-news/shared";
import type { TabId } from "../shared/lib/nav";
import type { TodayTab } from "../shared/lib/today";
import { itemBigTags } from "../shared/lib/bigTags";
import { bundleCounts, newsScoreScale } from "../shared/lib/bundle";
import { SavedScreen } from "../shared/SavedScreen";
import { RecapScreen } from "../shared/RecapScreen";
import { Sidebar } from "./Sidebar";
import { DayList } from "./DayList";
import { DetailPane } from "./DetailPane";

const DESKTOP_MQ = "(min-width: 1024px)";

/** 選択中の行をリストの見える範囲に入れる。ListCard の DOM id は `d-item-*`。 */
function revealItem(id: string, behavior: ScrollBehavior = "auto") {
  document.getElementById(`d-item-${id}`)?.scrollIntoView({ block: "nearest", behavior });
}

/**
 * デスクトップシェル。左サイドバー / 中央リスト / 右詳細ペインの 3 ペイン。
 * Saved / Recap タブでは既存のモバイル向け画面を中央カラムに流用し、右ペインは畳む。
 *
 * 表示状態 (tab / currentDate / saved) は AppRoot から props で来る。ここで持つのは
 * デスクトップ固有の選択状態だけ。
 */
export function DesktopApp({
  archive,
  bundles,
  currentDate,
  setCurrentDate,
  tab,
  setTab,
  saved,
  toggleSave,
  nowMs,
}: {
  archive: string[];
  bundles: Record<string, DailyBundle>;
  currentDate: string | null;
  setCurrentDate: (d: string) => void;
  tab: TabId;
  setTab: (t: TabId) => void;
  saved: Set<string>;
  toggleSave: (id: string) => void;
  nowMs: number;
}) {
  const [todayTab, setTodayTab] = useState<TodayTab>("all");
  const [bigFilter, setBigFilter] = useState<BigTagGroup | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bundle = currentDate ? bundles[currentDate] ?? null : null;

  const counts = useMemo(() => bundleCounts(bundle?.items ?? []), [bundle]);
  /** 評価バーの分母。フィルタ結果ではなく日次全体から取り、タブ切り替えでバー長が動かないようにする。 */
  const scoreScale = useMemo(() => newsScoreScale(bundle?.items ?? []), [bundle]);

  const items = useMemo(() => {
    if (!bundle) return [];
    return bundle.items.filter((it) => {
      if (todayTab === "paper" && it.kind !== "paper") return false;
      if (todayTab === "news" && it.kind !== "news") return false;
      if (bigFilter && !itemBigTags(it).includes(bigFilter)) return false;
      return true;
    });
  }, [bundle, todayTab, bigFilter]);

  /**
   * 日付・タブ・フィルタが変わって選択が消えたら先頭に寄せ、右ペインが空白にならないようにする。
   * effect ではなくレンダー時の導出にしているのは、SSR 段階でも先頭が選ばれた状態を出して
   * hydration 直後にプレースホルダがちらつくのを防ぐため。
   */
  const selected = useMemo(() => {
    if (items.length === 0) return null;
    return items.find((i) => i.id === selectedId) ?? items[0] ?? null;
  }, [items, selectedId]);

  /** archive は新しい順。dir=-1 が前日 (より古い)、dir=+1 が翌日。 */
  const stepDate = useCallback(
    (dir: -1 | 1) => {
      if (!currentDate) return;
      const i = archive.indexOf(currentDate);
      if (i < 0) return;
      const next = archive[i - dir];
      if (next) setCurrentDate(next);
    },
    [archive, currentDate, setCurrentDate],
  );

  const select = useCallback((id: string) => setSelectedId(id), []);

  /** 続いている話題カード → 該当タブへ移動し、対象を選択してリストをそこまで送る。 */
  const jumpTo = useCallback((id: string, kind: BaseItem["kind"]) => {
    setTodayTab(kind === "paper" ? "paper" : "news");
    setBigFilter(null);
    setSelectedId(id);
    requestAnimationFrame(() => revealItem(id, "smooth"));
  }, []);

  useEffect(() => {
    if (tab !== "today") return;
    const onKey = (e: KeyboardEvent) => {
      // モバイル幅では DesktopApp は display:none。見えないリストを操作しないよう弾く。
      if (!window.matchMedia(DESKTOP_MQ).matches) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      // ボタン / リンクにフォーカスがある間は Enter を横取りしない (その要素の起動を優先)。
      const onControl = !!t?.closest("button, a, [role=\"button\"]");

      const idx = selected ? items.findIndex((i) => i.id === selected.id) : -1;
      const move = (d: 1 | -1) => {
        if (items.length === 0) return;
        const next = idx < 0 ? 0 : Math.min(items.length - 1, Math.max(0, idx + d));
        const it = items[next];
        if (!it) return;
        setSelectedId(it.id);
        revealItem(it.id);
      };

      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          move(1);
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          move(-1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          stepDate(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          stepDate(1);
          break;
        case "Enter":
          if (onControl) break;
          if (selected) {
            e.preventDefault();
            window.open(selected.url, "_blank", "noreferrer");
          }
          break;
        case "s":
          if (selected) {
            e.preventDefault();
            toggleSave(selected.id);
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, selected, stepDate, tab, toggleSave]);

  return (
    <div className={`desktop-shell${tab === "today" ? "" : " is-single"}`}>
      <div className="desktop-col desktop-scroll">
        <Sidebar
          archive={archive}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          tab={tab}
          setTab={setTab}
          bundle={bundle}
          counts={counts}
          bigFilter={bigFilter}
          setBigFilter={setBigFilter}
        />
      </div>

      <div className="desktop-col">
        {tab === "today" &&
          (bundle ? (
            <DayList
              bundle={bundle}
              bundles={bundles}
              tab={todayTab}
              setTab={setTodayTab}
              counts={counts}
              items={items}
              selectedId={selected?.id ?? null}
              onSelect={select}
              saved={saved}
              toggleSave={toggleSave}
              nowMs={nowMs}
              scoreScale={scoreScale}
              onJump={jumpTo}
            />
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--fg-faint)" }}>
              読み込み中…
            </div>
          ))}
        {tab === "saved" && (
          <div className="desktop-narrow">
            <SavedScreen allBundles={bundles} saved={saved} toggleSave={toggleSave} nowMs={nowMs} />
          </div>
        )}
        {tab === "recap" && (
          <div className="desktop-narrow">
            <RecapScreen allBundles={bundles} archive={archive} />
          </div>
        )}
      </div>

      {tab === "today" && (
        <div className="desktop-col desktop-scroll">
          <DetailPane
            item={selected}
            saved={selected ? saved.has(selected.id) : false}
            onSave={() => selected && toggleSave(selected.id)}
            nowMs={nowMs}
          />
        </div>
      )}
    </div>
  );
}
