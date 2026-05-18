import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { describe, it, after } from "node:test";
import {
  CACHE_DIR,
  fetchWithFeedCache,
  readFeedCache,
  writeFeedCache,
} from "./cache.js";
import type { RawItem } from "./sources/types.js";

const FEED_CACHE_DIR = join(CACHE_DIR, "feeds");
const createdIds: string[] = [];

function uniqueId(): string {
  const id = `_test_fwfc_${randomBytes(6).toString("hex")}`;
  createdIds.push(id);
  return id;
}

after(async () => {
  for (const id of createdIds) {
    await unlink(join(FEED_CACHE_DIR, `${id}.json`)).catch(() => undefined);
  }
});

const sampleItem: RawItem = {
  title: "hello",
  url: "https://example.com/a",
  description: "",
  source: "test:src",
  publishedAt: new Date().toISOString(),
  baseScore: 0,
};

describe("fetchWithFeedCache", () => {
  it("成功時: fetcher の結果を parse して items / cached:false を返し、キャッシュを書き戻す", async () => {
    const id = uniqueId();
    const result = await fetchWithFeedCache(
      id,
      "test",
      async () => '{"ok":true}',
      () => [sampleItem],
    );
    assert.deepEqual(result, { items: [sampleItem], cached: false });
    const persisted = await readFeedCache(id);
    assert.ok(persisted);
    assert.equal(persisted?.items.length, 1);
  });

  it("fetch 失敗 + 有効キャッシュあり → last-good フォールバック", async () => {
    const id = uniqueId();
    await writeFeedCache(id, {
      items: [sampleItem],
      fetchedAt: new Date().toISOString(),
    });
    const result = await fetchWithFeedCache(
      id,
      "test",
      async () => {
        throw new Error("network down");
      },
      () => {
        throw new Error("parse should not run");
      },
    );
    assert.deepEqual(result, { items: [sampleItem], cached: true });
  });

  it("fetch 失敗 + キャッシュなし → throw", async () => {
    const id = uniqueId();
    await assert.rejects(
      fetchWithFeedCache(
        id,
        "test",
        async () => {
          throw new Error("network down");
        },
        () => [],
      ),
      /network down/,
    );
  });

  it("fetch 失敗 + キャッシュが古い (>7日) → throw", async () => {
    const id = uniqueId();
    const stale = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString();
    await writeFeedCache(id, { items: [sampleItem], fetchedAt: stale });
    await assert.rejects(
      fetchWithFeedCache(
        id,
        "test",
        async () => {
          throw new Error("nope");
        },
        () => [],
      ),
      /nope/,
    );
  });
});
