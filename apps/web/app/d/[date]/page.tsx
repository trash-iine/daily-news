import { notFound } from "next/navigation";
import { getDaily, getIndex } from "@/lib/data";
import { Masthead } from "@/app/components/Masthead";
import { SearchableList } from "@/app/components/SearchableList";

export async function generateStaticParams() {
  const idx = await getIndex();
  return idx.dates.map((date) => ({ date }));
}

export default async function DatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const [bundle, idx] = await Promise.all([getDaily(date), getIndex()]);
  if (!bundle) notFound();
  const archive = idx.dates;
  const nowMs = Date.now();

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
