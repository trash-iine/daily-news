import type { BaseItem } from "@daily-news/shared";
import { DAY_WINDOW_DAYS, getIndex, getWindow } from "@/lib/data";
import { detectSeries } from "@/app/components/shared/lib/series";

/**
 * 機械が「いちばん新しい版」だけを確実に読むための入口。
 *
 * トップページは直近 7 日の窓を持つクライアント UI なので、HTML をテキストとして読むと
 * 別の日の一覧まで拾いやすい。ここでは最新日 1 日分だけを、タイトルと元記事の URL に
 * 絞って返す。要約・抜粋は外部の文章をそのまま含みうるので載せない。
 *
 * ビルド時に静的生成する (data/ はビルド時に固定。日次の Actions コミットで再デプロイされる)。
 */
export const dynamic = "force-static";

interface LatestItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  tags: string[];
}

function toLatestItem(it: BaseItem): LatestItem {
  return {
    title: it.title,
    url: it.url,
    source: it.source,
    publishedAt: it.publishedAt,
    tags: it.tags,
  };
}

export async function GET() {
  const idx = await getIndex();
  const date = idx.dates[0] ?? null;
  if (!date) {
    return Response.json({ date: null, papers: [], news: [], series: [] }, { status: 404 });
  }

  const bundles = await getWindow(date, DAY_WINDOW_DAYS);
  const bundle = bundles[date];
  if (!bundle) {
    return Response.json({ date, papers: [], news: [], series: [] }, { status: 404 });
  }

  const byScore = [...bundle.items].sort((a, b) => b.score - a.score);
  const papers = byScore.filter((it) => it.kind === "paper").map(toLatestItem);
  const news = byScore.filter((it) => it.kind === "news").map(toLatestItem);
  const series = detectSeries(bundles, date, bundle.items).map((s) => ({
    tag: s.tag,
    ratio: Math.round(s.ratio * 10) / 10,
    days: s.days.map((d) => ({
      date: d.date,
      title: d.item?.title ?? null,
      url: d.item?.url ?? null,
    })),
  }));

  return Response.json({
    date,
    generatedAt: bundle.generatedAt,
    counts: { all: bundle.items.length, papers: papers.length, news: news.length },
    papers,
    news,
    series,
  });
}
