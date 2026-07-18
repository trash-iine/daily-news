import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { rankNews } from "./ranking.js";
import type { RawItem } from "./sources/types.js";

function rawItem(overrides: Partial<RawItem>): RawItem {
  return {
    title: "placeholder",
    url: "https://example.com/placeholder",
    description: "",
    source: "rss:unknown",
    publishedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("rankNews: defaultTags によるソース単位のタグ付与", () => {
  it("thinky-games の記事はキーワード非一致でも rankNews を通過し puzzle-game タグを持つ", () => {
    const items = rankNews(
      [
        rawItem({
          title: "The Roottrees are Dead team bring a mystery to life",
          url: "https://thinkygames.com/features/example/",
          description: "A review of a new release.",
          source: "rss:thinky-games",
          baseScore: 12,
        }),
      ],
      new Set(),
    );
    assert.equal(items.length, 1);
    assert.ok(items[0]!.tags.includes("puzzle-game"));
  });

  it("defaultTags の無い RSS ソースはキーワード非一致だと従来どおり除外される", () => {
    const items = rankNews(
      [
        rawItem({
          title: "Completely unrelated announcement",
          url: "https://example.com/unrelated/",
          description: "Nothing about the configured interests.",
          source: "rss:quanta-magazine",
        }),
      ],
      new Set(),
    );
    assert.equal(items.length, 0);
  });

  it("キーワード一致した thinky-games 記事は matched タグが先頭のまま puzzle-game が後ろに付く", () => {
    const items = rankNews(
      [
        rawItem({
          title: "A puzzle game about Rust ownership",
          url: "https://thinkygames.com/features/rust-puzzle/",
          description: "Learning Rust through puzzles.",
          source: "rss:thinky-games",
          baseScore: 12,
        }),
      ],
      new Set(),
    );
    assert.equal(items.length, 1);
    const tags = items[0]!.tags;
    assert.ok(tags.includes("rust"));
    assert.ok(tags.includes("puzzle-game"));
    assert.notEqual(tags[0], "puzzle-game");
  });
});
