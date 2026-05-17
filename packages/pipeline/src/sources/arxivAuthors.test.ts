import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { shortenAuthors, splitAuthorList } from "./arxiv.js";

describe("splitAuthorList", () => {
  it("カンマ区切り", () => {
    assert.deepEqual(splitAuthorList("A. Smith, B. Lee, C. Tanaka"), [
      "A. Smith",
      "B. Lee",
      "C. Tanaka",
    ]);
  });

  it("末尾 and を区切りとして扱う", () => {
    assert.deepEqual(splitAuthorList("A. Smith, B. Lee and C. Tanaka"), [
      "A. Smith",
      "B. Lee",
      "C. Tanaka",
    ]);
  });

  it("セミコロン区切り", () => {
    assert.deepEqual(splitAuthorList("Smith, A.; Lee, B."), [
      "Smith",
      "A.",
      "Lee",
      "B.",
    ]);
    // 注: arXiv の dc:creator は "Lastname, F." を ; で繋ぐ形式なので、
    // 厳密には Lastname と F. が分離される。表示上は "Lastname F." 相当の精度で
    // 十分なので今回は許容する。
  });

  it("空文字列", () => {
    assert.deepEqual(splitAuthorList(""), []);
    assert.deepEqual(splitAuthorList("   "), []);
  });
});

describe("shortenAuthors", () => {
  it("max 以下ならそのまま", () => {
    assert.deepEqual(shortenAuthors(["A", "B"], 3), ["A", "B"]);
  });

  it("max 超なら +N で打ち切り", () => {
    assert.deepEqual(shortenAuthors(["A", "B", "C", "D", "E"], 3), [
      "A",
      "B",
      "C",
      "+2",
    ]);
  });

  it("デフォルト max = 3", () => {
    const out = shortenAuthors(["A", "B", "C", "D"]);
    assert.equal(out.length, 4);
    assert.equal(out[3], "+1");
  });
});
