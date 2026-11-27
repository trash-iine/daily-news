# 開発の進め方

## セットアップ

- Node `>=20` (ルート `package.json` の `engines`)。Actions は Node 24 で動かしている
- pnpm `10.33.2` (`packageManager` で固定。`corepack enable` で揃えられる)

```bash
pnpm install
```

lint と formatter は入れていない。コードの書き方は周りのファイルに合わせる (2 スペース、ダブルクォート、ESM の import は `.js` 拡張子付き)。

## コマンド

| コマンド | 用途 |
|---|---|
| `pnpm typecheck` | 全ワークスペースの型チェック (`tsc --noEmit`) |
| `pnpm --filter @daily-news/pipeline test` | パイプラインのユニットテスト |
| `pnpm web:dev` | 開発サーバ (`http://localhost:3000`) |
| `pnpm web:build` | 本番ビルド |
| `pnpm pipeline` | パイプラインの実行 ([下の注意](#パイプラインをローカルで動かす)) |

## 何を変えたら何で確かめるか

| 変えたもの | 確かめ方 |
|---|---|
| `config.ts` の設定・型 | `pnpm typecheck`。キーワード・タグを触ったなら `pnpm --filter @daily-news/pipeline test` も (`tags.test.ts` が、`KEYWORD_WEIGHTS` / `TAG_ALIASES` / `defaultTags` から出るタグがすべて `BIG_TAG_GROUPS` にあるかを見る) |
| 採点・選抜のロジック (`score.ts` / `ranking.ts` / `paperFinalists.ts` など) | `pnpm --filter @daily-news/pipeline test` |
| ソースのパーサ | テストを足して `pnpm --filter @daily-news/pipeline test` |
| `packages/shared` の型 | `pnpm typecheck` (pipeline と web の両方に効く) |
| Web UI | `pnpm web:dev` でスマホ幅と PC 幅の両方を見る → `pnpm web:build` |
| パイプライン全体 | ローカルで回さず、マージ後に Actions の `workflow_dispatch` で確かめる |

Web はコミット済みの `data/` を読むので、UI の確認のためにパイプラインを動かす必要は無い。

## テスト

Node 組み込みのテストランナー (`node:test`) を `tsx` 経由で使う。

```bash
pnpm --filter @daily-news/pipeline test
# 実体: node --import tsx --test src/*.test.ts src/**/*.test.ts
```

- テストは対象のファイルの隣に `{name}.test.ts` で置く。glob はシェルが展開するので、`src/` 直下か 1 段下のディレクトリ (`src/sources/` / `src/venues/`) にあるものだけが拾われる
- `describe` / `it` と `node:assert` の `strict` を使う。`score.test.ts` が書き方の例
- **ネットワークに出ない**。パーサは実際のレスポンスと同じ構造の文字列 (fixture) をテストの中に書いて、`parseArxivApiXml` などの純粋関数に渡す (`sources/arxivApi.test.ts` / `venues/venues.test.ts`)
- 設定値に依存するテストは、値そのものではなく性質を確かめる (例: `tags.test.ts` は「`KEYWORD_WEIGHTS` から出るタグがすべて `BIG_TAG_GROUPS` にある」を見る)。`config.ts` を調整するたびにテストを書き換えなくて済む
- Web にはテストが無い。ロジックは `shared/lib/` の純粋関数に寄せておく

## パイプラインをローカルで動かす

`pnpm pipeline` は**外部の RSS / API と OpenAI を本当に叩く**。気軽に回さない。どうしても回すとき:

```bash
OPENAI_API_KEY=sk-... pnpm pipeline   # キー無しでも動く (要約は abstract の冒頭になる)
```

- 実行すると `data/` の JSON が書き換わる。これは**コミットしない** (`data/` は Actions だけがコミットする)。終わったら `git status -- data/` で差分を見て、`git restore data/` で戻し、新しくできた日付ファイルがあれば消す
- `data/.cache/` も手元にできる (git 管理外)。消しても次回は普通に取り直す
- 時間がかかる。大半は arXiv API の 3 秒間隔待ちで、採択リストの照合が多い日ほど長い (Actions の上限は 25 分)
- 1 つのソースだけ試したいときは、パイプライン全体を回さず、そのソースのパーサをテストで確かめる

## コミットと PR

- ブランチを切って PR を出す (`feat/...` / `fix/...` / `chore/...`)。`main` には Actions が毎日 `data:` コミットを積むので、作業ブランチは `data/` を触らない限り衝突しない
- コミットメッセージは日本語で、何をなぜ変えたかを書く。プレフィクスは既存に合わせる

| プレフィクス | 用途 |
|---|---|
| `FEAT:` | 機能の追加 |
| `FIX:` | バグの修正 |
| `REFACTOR:` | 挙動を変えない書き換え |
| `CHORE:` | ドキュメント・設定・CI・整理 |
| `UPGRADE:` | 依存や Actions の更新 |
| `REMOVE:` | 機能の削除 |
| `data:` | Actions 専用。人は使わない |

- 外部ソースを足す PR には、利用規約・`robots.txt` を確認した結果を書く ([pipeline.md](./pipeline.md#新しいソースを足す手順))
- シークレット (`.env*`、`OPENAI_API_KEY`) はコミットしない。本番のキーは GitHub Secrets にある

## トラブル対応

### 論文が 0 件の日がある

- 土日など arXiv の発表が無い日は 0 件になりうる。これは正常
- 平日に 0 件なら、まずソースが空を返していないか疑う。Actions のログで `[main] collected N news / M papers` の `M` と、`[source] arxiv:... failed` の警告を見る。以前、arXiv の新しい RSS が空を返すようになり、Atom API に切り替えたことがある

### 特定のフィードが出てこない

- Actions のログに `[source] {id} failed:` や `[rss] {id} ... using last-good cache` が出ていないか見る
- 手元でパイプラインを回したあとなら、`data/.cache/health.log` を見る

```bash
grep '"status":"failed"' data/.cache/health.log | tail -20
```

- 取れているのに出ない場合は採点で落ちている。`BIG_TAG_GROUPS` に属するタグが付いているか、`merit` が閾値を超えているかを見る ([pipeline.md のスコアリング](./pipeline.md#ニュース-ranknews))。Actions のログの `dropped N news items (no big-tag group / below threshold)` が手がかりになる

### Actions が失敗した

- `timeout-minutes` 超え: arXiv 照合の件数 (`VENUE_MATCH_MAX_PER_RUN`) やカテゴリ数が増えていないか見る
- `rebase failed (conflict?)`: 誰かが `data/` を手でコミットして Actions のコミットとぶつかった可能性がある。`data/` を手で編集しない
- 再実行は Actions タブから `daily-news` を `workflow_dispatch` で。同じ日に 2 回回すと item が足し合わされる ([data-format.md](./data-format.md#同じ日に-2-回実行したとき))

### サイトが更新されない

`main` に当日の `data:` コミットがあるかを見る。あれば Vercel のデプロイ状況を、無ければ Actions のログを見る。
