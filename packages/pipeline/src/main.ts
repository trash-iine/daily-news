import { NEWS_SEEN_LOOKBACK_DAYS } from "./config.js";
import { collectNews, collectPapers, collectTrending } from "./collect.js";
import { rankNews, rankPapers } from "./ranking.js";
import { enrichWithThumbnails } from "./enrichment.js";
import { loadRecentNewsIds, updateIndex, writeDaily } from "./store.js";
import { todayString } from "./util.js";

async function main() {
  const date = todayString();
  console.log(`[main] running for ${date}`);

  const [rawNews, rawPapers, seenNewsIds, trending] = await Promise.all([
    collectNews(),
    collectPapers(),
    loadRecentNewsIds(date, NEWS_SEEN_LOOKBACK_DAYS),
    collectTrending(),
  ]);
  console.log(
    `[main] collected ${rawNews.length} news / ${rawPapers.length} papers / ${trending.length} trending; ${seenNewsIds.size} previously-seen news ids`,
  );

  const news = rankNews(rawNews, seenNewsIds);
  const papers = await rankPapers(rawPapers);
  console.log(`[main] selected ${news.length} news / ${papers.length} papers`);

  if (papers.length === 0) {
    console.log("[main] no fresh papers today — leaving papers section empty");
  }

  const items = [...papers, ...news];
  if (items.length === 0) {
    console.warn("[main] no items selected; nothing to write");
    return;
  }

  const enriched = await enrichWithThumbnails(items);
  const withThumbs = enriched.filter((i) => i.thumbnail).length;
  console.log(`[main] enriched ${withThumbs}/${enriched.length} items with thumbnails`);

  await writeDaily(date, enriched, trending);
  await updateIndex(date);
  console.log(`[main] wrote data/${date}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
