import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { BIG_TAG_GROUPS } from "@daily-news/shared";
import { KEYWORD_WEIGHTS, RSS_FEEDS, TAG_ALIASES } from "./config.js";

function canonicalOf(matched: string): string {
  const k = matched.toLowerCase();
  return TAG_ALIASES[k] ?? k;
}

describe("tag config: KEYWORD_WEIGHTS → canonical → BIG_TAG_GROUPS", () => {
  it("KEYWORD_WEIGHTS のキー由来 canonical はすべて BIG_TAG_GROUPS に登録されている (news で除外されない)", () => {
    const missing: string[] = [];
    for (const k of Object.keys(KEYWORD_WEIGHTS)) {
      const canon = canonicalOf(k);
      if (!(canon in BIG_TAG_GROUPS)) missing.push(`${k} -> ${canon}`);
    }
    assert.deepEqual(missing, []);
  });

  it("TAG_ALIASES の右辺 canonical はすべて BIG_TAG_GROUPS に登録されている", () => {
    const missing: string[] = [];
    for (const v of new Set(Object.values(TAG_ALIASES))) {
      if (!(v in BIG_TAG_GROUPS)) missing.push(v);
    }
    assert.deepEqual(missing, []);
  });

  it("AI 系の代表 canonical (claude / mcp / claude-code) は ai 大タグに紐づく", () => {
    assert.equal(BIG_TAG_GROUPS["claude"], "ai");
    assert.equal(BIG_TAG_GROUPS["mcp"], "ai");
    assert.equal(BIG_TAG_GROUPS["claude-code"], "ai");
  });

  it("`claude code` matched は canonical=claude-code に正規化される", () => {
    assert.equal(canonicalOf("claude code"), "claude-code");
  });

  it("`model context protocol` matched は canonical=mcp に正規化される", () => {
    assert.equal(canonicalOf("model context protocol"), "mcp");
  });

  it("quantum 系は computing と algorithm の 2 種に分かれる", () => {
    assert.equal(canonicalOf("quantum computing"), "quantum-computing");
    assert.equal(canonicalOf("quantum algorithm"), "quantum-algorithm");
    assert.equal(BIG_TAG_GROUPS["quantum-computing"], "algorithm");
    assert.equal(BIG_TAG_GROUPS["quantum-algorithm"], "algorithm");
  });

  it("旧 canonical `quantum` は後方互換のため hobby/algorithm マッピングを保持する", () => {
    // 蓄積済み data/*.json には旧 alias 結果の "quantum" が残る
    assert.equal(BIG_TAG_GROUPS["quantum"], "algorithm");
  });

  it("RSS_FEEDS の defaultTags はすべて BIG_TAG_GROUPS に登録されている (news で除外されない)", () => {
    const missing: string[] = [];
    for (const f of RSS_FEEDS) {
      for (const t of f.defaultTags ?? []) {
        if (!(t in BIG_TAG_GROUPS)) missing.push(`${f.id} -> ${t}`);
      }
    }
    assert.deepEqual(missing, []);
  });
});
