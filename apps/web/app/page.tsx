import { getAllBundles, getIndex } from "@/lib/data";
import { AppRoot } from "./components/AppRoot";

export default async function HomePage() {
  const [idx, bundles] = await Promise.all([getIndex(), getAllBundles()]);
  const archive = idx.dates;
  const initialDate = archive[0] ?? null;
  const generatedAt = (initialDate && bundles[initialDate]?.generatedAt) || idx.updatedAt;

  if (!initialDate) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--fg-faint)" }}>
        まだデータがありません。パイプラインを実行してください。
      </div>
    );
  }

  return (
    <AppRoot
      archive={archive}
      bundles={bundles}
      initialDate={initialDate}
      generatedAt={generatedAt}
    />
  );
}
