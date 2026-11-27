# アーキテクチャ

daily-news は「毎朝 1 回だけ動くバッチ」と「その成果物を読むだけの静的サイト」の 2 つに分かれている。間をつなぐのは git にコミットされた `data/` の JSON だけで、DB や API サーバは無い。

## パッケージ構成

pnpm workspace の monorepo (`pnpm-workspace.yaml`)。

```
packages/shared    型 (types.ts) と big tag グループ (big-tag-groups.ts)。ビルドせず TS ソースのまま公開
   ↑          ↑
packages/pipeline  apps/web
   │               ↑
   └──→ data/ ─────┘   (pipeline が書き、web がビルド時に読む)
```

- `@daily-news/shared` は両方から `workspace:*` で参照される。`data/*.json` の形は `packages/shared/src/types.ts` が唯一の定義 ([data-format.md](./data-format.md))
- `@daily-news/pipeline` は `tsx src/main.ts` で直接実行する。ビルド成果物は無い
- `@daily-news/web` は Next.js 15 (App Router)。`data/` をビルド時にファイルシステムから読み、ページを静的生成する

## 日次の流れ

```
GitHub Actions (.github/workflows/daily.yml)
  cron 43 21 * * * (UTC) = 06:43 JST  /  workflow_dispatch
  │
  ├─ actions/cache で data/.cache/ (フィードの HTTP キャッシュ) を復元
  ├─ pnpm --filter @daily-news/pipeline start   ← OPENAI_API_KEY は Secrets
  │     └─ data/YYYY-MM-DD.json / data/index.json / data/venues/*.json を書く
  └─ data/ に差分があれば "data: YYYY-MM-DD collection" をコミットし push
        (push が拒否されたら pull --rebase して最大 3 回リトライ)
              │
              ▼
Vercel: push を検知して apps/web を再ビルド → 当日分が公開される
```

- `concurrency: daily-news-collect` で cron と手動実行が重ならないよう直列化している
- `timeout-minutes: 25`。所要時間の大半は arXiv API の 3 秒間隔待ち ([pipeline.md のレート制限](./pipeline.md#レート制限))
- 日付は JST (`util.ts` の `todayString`)。06:43 JST に動くので、ファイル名の日付と閲覧する日は一致する

## パイプラインの処理段階

`packages/pipeline/src/main.ts` の流れ。

```
1. 並列に取得
   ├─ collectNews()        RSS / Qiita / Zenn / HN (興味タグ・クエリ別)       collect.ts
   ├─ collectPapers()      arXiv (カテゴリを逐次、3 秒間隔) → APS (並列)       collect.ts
   ├─ collectTrending()    Qiita / Zenn / HN の site-wide 人気記事            collect.ts
   └─ loadRecentNewsIds / loadRecentPaperIds   直近 N 日に出た id (再掲防止)   store.ts

2. rankNews()              ニュースを採点して採用分を選ぶ                       ranking.ts

3. 並列に
   ├─ rankPapers()         論文を採点 → 採用分を OpenAI で要約                 ranking.ts / summarize.ts
   └─ collectVenueItems()  会議採択論文・論文誌の新着 → data/venues/ を更新      venues/index.ts

4. selectTrendingNews()    興味タグ外の「話題」枠を追加                         ranking.ts

5. enrichWithThumbnails()  採用した item の OG 画像を取得 (並列度 8)           enrichment.ts

6. writeDaily() / updateIndex()   data/YYYY-MM-DD.json と data/index.json を書く  store.ts
```

段階の並べ方には理由がある。

- **`collectVenueItems` を `collectPapers` の後に回している**: どちらも arXiv API を叩く。arXiv の利用規約は「3 秒に 1 回、同時接続 1 本」なので、同時に走らせると違反する。`collectPapers` が終わってから venue 側の arXiv 照合を始める
- **`rankPapers` と `collectVenueItems` は並列**: `rankPapers` が外に出るのは OpenAI だけで、arXiv は叩かない
- **`selectTrendingNews` は `rankNews` の後**: 通常枠で採用済みの URL を除外するため

## 失敗時の方針

1 つのソースが落ちても、その日の出力は止めない。

- 各ソースの取得は `collect.ts` の `safe()` / `safeFeed()` で包まれ、例外は空配列に変わる。`safeFeed()` は結果を `data/.cache/health.log` に 1 行追記する
- RSS などキャッシュ対応のソースは、取得に失敗しても 7 日以内の前回取得分 (last-good) があればそれを返す
- `collectVenueItems` の失敗は `main.ts` で握りつぶし、通常の論文・ニュースは書き出す
- OpenAI が使えない (キー未設定・呼び出し失敗) ときは abstract 冒頭 240 字を要約の代わりに入れる
- 採用 item が 0 件ならファイルを書かずに終了する (`data/` に差分が出ないので Actions もコミットしない)

逆に `main()` 自体が投げた例外は `process.exit(1)` で Actions を失敗させる。

## Web 側

`apps/web` は `data/` をビルド時に読むだけで、実行時にはファイルを読まない (`/d/[date]` も `dynamicParams = false`)。詳しくは [web.md](./web.md)。
