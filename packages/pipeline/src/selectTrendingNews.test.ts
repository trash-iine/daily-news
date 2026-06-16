import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { TrendingItem } from "@daily-news/shared";
import { TRENDING_TAG } from "@daily-news/shared";
import { selectTrendingNews } from "./ranking.js";
import { hashId } from "./util.js";

// velocityScore は popularity ÷ √経過時間。published→fetched を 4h にすると
// factor = sqrt(8/(4+4)) = 1.0 となり velocity = popularity になる (決定的にテストするため)。
const PUB = "2026-06-16T00:00:00.000Z";
const FETCHED = "2026-06-16T04:00:00.000Z";

function mk(
  idx: number,
  popularity: number,
  opts?: { title?: string; tags?: string[]; raw?: number; source?: string },
): TrendingItem {
  return {
    source: opts?.source ?? "qiita-trending",
    title: opts?.title ?? `trending ${idx}`,
    url: `https://example.com/t/${idx}`,
    publishedAt: PUB,
    fetchedAt: FETCHED,
    popularity,
    tags: opts?.tags ?? [],
    ...(opts?.raw !== undefined ? { popularityRaw: opts.raw } : {}),
  };
}

describe("selectTrendingNews", () => {
  it("velocity 降順で n 件に絞り、kind/マーカータグを付ける", () => {
    const trending = [mk(1, 10), mk(2, 30), mk(3, 20)];
    const out = selectTrendingNews(trending, new Set(), new Set(), 2);
    assert.equal(out.length, 2);
    // 30, 20 が velocity 上位
    assert.deepEqual(
      out.map((i) => i.score),
      [30, 20],
    );
    for (const i of out) {
      assert.equal(i.kind, "news");
      assert.equal(i.tags[0], TRENDING_TAG);
      assert.equal(i.summary, "");
      assert.equal(i.keywordScore, 0);
    }
  });

  it("MIN_VELOCITY 未満 (velocity 5 未満) を落とす", () => {
    // popularity 3 → velocity 3 < 5 で除外、20 のみ残る
    const out = selectTrendingNews([mk(1, 3), mk(2, 20)], new Set(), new Set(), 5);
    assert.equal(out.length, 1);
    assert.equal(out[0]?.score, 20);
  });

  it("excludeUrls / seenIds (hashId 照合) で重複を除外する", () => {
    const a = mk(1, 30);
    const b = mk(2, 25);
    const c = mk(3, 20);
    const exclude = new Set([a.url]);
    const seen = new Set([hashId(b.url)]);
    const out = selectTrendingNews([a, b, c], exclude, seen, 5);
    assert.deepEqual(
      out.map((i) => i.url),
      [c.url],
    );
  });

  it("negative keyword を含む title を除外する", () => {
    const out = selectTrendingNews(
      [mk(1, 30, { title: "これは sponsored な記事" }), mk(2, 10)],
      new Set(),
      new Set(),
      5,
    );
    assert.deepEqual(
      out.map((i) => i.score),
      [10],
    );
  });

  it("元タグを残しつつ TRENDING_TAG を先頭に付け、popularityRaw からラベルを組む", () => {
    const out = selectTrendingNews(
      [mk(1, 30, { tags: ["python"], raw: 100, source: "qiita-trending" })],
      new Set(),
      new Set(),
      5,
    );
    assert.deepEqual(out[0]?.tags, [TRENDING_TAG, "python"]);
    assert.equal(out[0]?.popularityLabel, "Qiita LGTM 100");
  });
});
