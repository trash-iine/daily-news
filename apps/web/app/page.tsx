import { DAY_WINDOW_DAYS, getIndex, getClientWindow } from "@/lib/data";
import { buildRecap } from "@/lib/recap";
import { AppRoot } from "./components/AppRoot";

export default async function HomePage() {
  const idx = await getIndex();
  const initialDate = idx.dates[0] ?? null;

  if (!initialDate) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--fg-faint)" }}>
        まだデータがありません。パイプラインを実行してください。
      </div>
    );
  }

  const [bundles, recap] = await Promise.all([
    getClientWindow(initialDate, DAY_WINDOW_DAYS),
    buildRecap(initialDate),
  ]);
  const generatedAt = bundles[initialDate]?.generatedAt || idx.updatedAt;

  return (
    <AppRoot
      archive={Object.keys(bundles).sort().reverse()}
      bundles={bundles}
      recap={recap}
      initialDate={initialDate}
      generatedAt={generatedAt}
    />
  );
}
