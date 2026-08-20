"use client";
import { useEffect, useState } from "react";
import type { DailyBundle } from "@daily-news/shared";
import type { TabId } from "./shared/lib/nav";
import { useSaved } from "./shared/useSaved";
import { MobileApp } from "./mobile/MobileApp";
import { DesktopApp } from "./desktop/DesktopApp";

/**
 * mobile / desktop 両方のツリーを SSR で描画し、globals.css の
 * .viewport-mobile / .viewport-desktop (1024px 境界) で出し分ける。
 *
 * 表示状態はここに集約する。とくに useSaved() を各レイヤーで呼ぶと ★ 保存が
 * 2 つの Set に分裂するので、必ずこの 1 箇所だけで呼ぶこと。
 */
export function AppRoot({
  archive,
  bundles,
  initialDate,
  generatedAt,
}: {
  archive: string[];
  bundles: Record<string, DailyBundle>;
  initialDate: string | null;
  generatedAt: string;
}) {
  const [tab, setTab] = useState<TabId>("today");
  const [currentDate, setCurrentDate] = useState<string | null>(initialDate);
  const { saved, toggle } = useSaved();

  // SSR uses bundle.generatedAt; CSR overrides with real now after mount.
  const [nowMs, setNowMs] = useState<number>(() => new Date(generatedAt).getTime());
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  const shared = {
    archive,
    bundles,
    currentDate,
    setCurrentDate,
    tab,
    setTab,
    saved,
    toggleSave: toggle,
    nowMs,
  };

  return (
    <>
      <div className="viewport-mobile">
        <MobileApp {...shared} />
      </div>
      <div className="viewport-desktop">
        <DesktopApp {...shared} />
      </div>
    </>
  );
}
