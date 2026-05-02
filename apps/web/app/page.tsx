import { getIndex, getLatest } from "@/lib/data";
import { Masthead } from "./components/Masthead";
import { SearchableList } from "./components/SearchableList";

export default async function HomePage() {
  const [bundle, idx] = await Promise.all([getLatest(), getIndex()]);
  const archive = idx.dates;
  const nowMs = Date.now();

  if (!bundle) {
    return (
      <div className="page">
        <div className="page-inner">
          <p className="empty">
            まだデータがありません。パイプラインを実行してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-inner">
        <Masthead bundle={bundle} archive={archive} currentDate={bundle.date} />
        <SearchableList items={bundle.items} nowMs={nowMs} />
        <footer className="foot">
          <span>Daily Digest · personal feed</span>
          <span>·</span>
          <span>
            built{" "}
            {new Date(bundle.generatedAt).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              timeZone: "Asia/Tokyo",
            })}
          </span>
          <span className="foot-spacer" />
          <span>
            {bundle.items.length} items / {archive.length} days
          </span>
        </footer>
      </div>
    </div>
  );
}
