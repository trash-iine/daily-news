import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { hasNegativeKeyword, scoreFields } from "./score.js";

const W = {
  rust: 5,
  python: 3,
  claude: 5,
  "自作キーボード": 5,
  "np-hard": 5,
};

describe("scoreFields", () => {
  it("単語境界マッチで部分一致を拒否する (rust が trustworthy に当たらない)", () => {
    const r = scoreFields("trustworthy library", "this is trustworthy", W);
    assert.equal(r.score, 0);
    assert.deepEqual(r.matched, []);
  });

  it("ASCII キーワードは単語境界で正しくマッチする", () => {
    const r = scoreFields("Rust 1.80 released", "", W);
    // title hit: 1 * TITLE_BOOST(=2) = 2 hits → 2 * 5 = 10、cap = weight*3 = 15 で頭打ちなし
    assert.equal(r.score, 10);
    assert.deepEqual(r.matched, ["rust"]);
  });

  it("body 内の出現回数 × weight が積まれる", () => {
    const r = scoreFields("intro", "claude is great. claude rocks.", W);
    // body hits: 2 * weight 5 = 10
    assert.equal(r.score, 10);
  });

  it("大量出現は cap (weight * 3) で頭打ちになる", () => {
    const body = ("python ").repeat(20);
    const r = scoreFields("", body, W);
    // weight=3, cap=9。20 hits * 3 = 60 → cap で 9
    assert.equal(r.score, 9);
  });

  it("タイトル一致は body 一致より重い", () => {
    const titleHit = scoreFields("Rust released", "", W).score;
    const bodyHit = scoreFields("", "Rust released", W).score;
    assert.ok(titleHit > bodyHit, `title=${titleHit} > body=${bodyHit}`);
  });

  it("非 ASCII (日本語) キーワードは部分一致で拾う", () => {
    const r = scoreFields("自作キーボードの作り方", "", W);
    // title hit: 1 * 2 = 2 hits → 2 * 5 = 10
    assert.equal(r.score, 10);
    assert.deepEqual(r.matched, ["自作キーボード"]);
  });

  it("ハイフンを含む ASCII キーワード (np-hard) も単語境界で動く", () => {
    const a = scoreFields("Solving NP-hard problems", "", W);
    // hit
    assert.ok(a.score > 0);
    const b = scoreFields("non-np-hardware", "", W);
    // np-hard\bが satisfied されるかは実装依存。\bは英数字 vs 非英数字で切る。
    // 実装上 "np-hard" は \bnp-hard\b → "non-np-hardware" の中の "np-hard" は
    // 後続が "ware" (英字) なので \b は立たず、マッチしない。
    assert.equal(b.score, 0);
  });

  it("複数キーワードのスコアは加算される", () => {
    const r = scoreFields("Rust and Python", "claude inside", W);
    // rust title: 2*5=10, python title: 2*3=6, claude body: 1*5=5 → 21
    // ただし cap weight*3 で個別に: rust 10<=15, python 6<=9, claude 5<=15 → 21
    assert.equal(r.score, 21);
    assert.deepEqual(new Set(r.matched), new Set(["rust", "python", "claude"]));
  });

  it("空文字は 0", () => {
    assert.equal(scoreFields("", "", W).score, 0);
  });
});

describe("hasNegativeKeyword", () => {
  const NEG = ["sponsored", "プロモーション"];

  it("title 一致で true", () => {
    assert.equal(hasNegativeKeyword("Sponsored content", "", NEG), true);
  });

  it("body 一致で true", () => {
    assert.equal(hasNegativeKeyword("News", "this is プロモーション", NEG), true);
  });

  it("無関係なら false", () => {
    assert.equal(hasNegativeKeyword("Rust release", "新機能", NEG), false);
  });

  it("空のネガティブリストでは false", () => {
    assert.equal(hasNegativeKeyword("anything", "anything", []), false);
  });
});
