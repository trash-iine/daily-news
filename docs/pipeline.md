# パイプライン (`packages/pipeline`)

収集・採点・要約をして `data/` に書くバッチ。処理の順序は [architecture.md](./architecture.md#パイプラインの処理段階) を参照。ここでは各モジュールの役割と、変更するときの決まりごとをまとめる。

設定値 (フィード一覧・キーワード重み・件数) はすべて `src/config.ts` にある。このページでは既定値を書かないので、数値は `config.ts` を見ること。

## モジュール一覧

| ファイル | 役割 |
|---|---|
| `main.ts` | エントリポイント。各段階を順に呼ぶだけで、ロジックは持たない |
| `config.ts` | 設定のハブ。ソース・キーワード・タグ別名・件数・閾値・モデル名 |
| `collect.ts` | ソースごとの取得をまとめる (`collectNews` / `collectPapers` / `collectTrending`)。失敗を空配列に変える `safe` / `safeFeed` もここ |
| `sources/*.ts` | ソース 1 種類ごとの取得とパース。`RawItem` (論文は `ArxivPaper`) を返す |
| `score.ts` | キーワード照合の純粋関数 (`scoreFields` / `hasNegativeKeyword`) |
| `scoreModel.ts` | `source` 文字列から人気指標・言語 tier・タグを決める関数群。velocity の計算 |
| `ranking.ts` | `rankNews` / `rankPapers` / `selectTrendingNews`。採点と採用の本体 |
| `paperFinalists.ts` | 論文の最終選抜と、量子論文の最低枠の補充 (`selectFinalists`) |
| `summarize.ts` | OpenAI で論文を構造化要約する (`summarizePaper`) |
| `enrichment.ts` / `thumbnail.ts` | 採用 item の OG 画像を並列に取る |
| `store.ts` | `data/YYYY-MM-DD.json` と `data/index.json` の読み書き、直近の id 集合 |
| `cache.ts` | フィードの HTTP キャッシュ (`data/.cache/feeds/`) と `health.log` |
| `util.ts` | `hashId` / `todayString` (JST) / `USER_AGENT` / `fetchText` / HTML 実体参照のデコード |
| `venues/` | 会議採択論文と論文誌 ([後述](#会議採択論文と論文誌-venues)) |

## スコアリング

### ニュース (`rankNews`)

item ごとに 2 つのスコアを出す。

```
merit = popularity + kwScore           閾値の判定に使う
score = merit + LANGUAGE_BONUS[tier]   並び順と表示に使う
```

- `popularity` (`scoreModel.ts: popularityScore`)
  - Qiita / Zenn: いいね数を `round(3 * sqrt(n))` に圧縮
  - Hacker News: points を `sources/popularity.ts: pointsToBaseScore` で sqrt 正規化 (上限あり)
  - RSS: フィード設定の `baseScore` をそのまま使う。更新頻度が低いフィードほど大きくして、たまに出る記事が埋もれないようにする
- `kwScore` (`score.ts: scoreFields`): `KEYWORD_WEIGHTS` をタイトルと本文に当てる。1 語あたり `(タイトルの出現数 × 2 + 本文の出現数) × weight` を `weight × 3` で頭打ちにして合計する。ASCII のキーワードは `\b` 単語境界で、日本語は部分一致で数える。Qiita / Zenn はタグ別 API なのでキーワード照合をせず、取得したタグをそのまま使う (`isPopularityOnly`)
- `tier` (`scoreModel.ts: sourceTier`): 0 = 日本語ソース、1 = `important: true` の英語 RSS、2 = それ以外 (HN など)

`LANGUAGE_BONUS` は並び順にだけ効き、閾値判定には使わない。質の低い記事がボーナスだけで採用されないようにするため。

採用の手順:

1. `NEWS_MAX_AGE_HOURS` 以内に公開されたもの
2. URL で重複を除き、直近 `NEWS_SEEN_LOOKBACK_DAYS` 日の bundle に出た id を除く
3. `NEGATIVE_KEYWORDS` を含むものを除く
4. `merit >= NEWS_SCORE_THRESHOLD`、かつタグのどれかが `BIG_TAG_GROUPS` に属するものだけ残す。**`BIG_TAG_GROUPS` に無いタグしか持たない item は落ちる**。RSS は `defaultTags` でフィード単位のタグを足せる
5. github.com への直リンクは、先頭タグごとに最高スコアの 1 件だけ
6. `BIG_TAG_GROUP_ORDER` の順に、各グループから `NEWS_MIN_PER_GROUP` 件ずつ確保
7. 残りを `score` の降順で `NEWS_TOP_N` 件まで埋める

### 話題枠 (`selectTrendingNews`)

興味タグとは関係なく、Qiita / Zenn / HN 全体で勢いのある記事を別に足す。勢いは `velocity = popularity × sqrt(8 / (経過時間 + 4))` (`scoreModel.ts: velocityScore`、経過 4 時間で係数 1)。`NEWS_TRENDING_MIN_VELOCITY` 以上のものから、通常枠で採用済みと直近に出たものを除いて上位 `NEWS_TRENDING_TOP_N` 件。タグの先頭に `TRENDING_TAG` が付く。web 側にも同じ式のコピーがある (`apps/web/app/components/shared/lib/trend.ts`)。片方を変えたらもう片方も変える。

### 論文 (`rankPapers`)

1. arXiv は `announceType === "new"` だけ残す (クロスリストと改訂は除く)。APS は常に `new`
2. タイトルが同じものと、直近の bundle に出た id を除く
3. `paperRelevance`: `PAPER_KEYWORDS` で `scoreFields` を取り、一致したキーワードの種類が多いほど `PAPER_MULTI_MATCH_BONUS` を足す
4. 並び順は「`PAPER_PRIORITY_KEYWORDS` を含む → スコア → 新しい順」。`PAPER_SCORE_THRESHOLD` 未満は除く
5. 上位 `PAPERS_TOP_N` 件を選ぶ。量子論文はキーワードで加点しない方針なので閾値で落ちうる。そのため閾値前の候補から量子論文を別に集め、`PAPERS_QUANTUM_MIN` 件に満たなければ入れ替える (`paperFinalists.ts`)
6. 選んだものだけ要約する

arXiv の発表が無い日 (土日など) は論文セクションが空になることがある。

### 要約 (`summarize.ts`)

`OPENAI_MODEL` に abstract を渡し、`{ topic, problem, method, result }` の JSON で受け取る。`problem` / `method` / `result` のどれかが欠けたら構造化要約は無しにする。`OPENAI_API_KEY` が無いとき、または呼び出しに失敗したときは、abstract の冒頭 240 字を `summary` に入れる。プロンプトを変えるときは、web 側の `PaperSummaryStruct.tsx` が各フィールドをどう表示するかも確認する。

## ソースモジュールの書き方

`sources/*.ts` の既存の実装に合わせる。

- **返り値**: ニュースは `RawItem[]` (`sources/types.ts`)、論文は `ArxivPaper[]` (`sources/arxiv.ts`)。`source` には [data-format.md の形式](./data-format.md#source-の形式) に沿った値を入れる
- **HTTP**: `USER_AGENT` (`util.ts`) を付ける。タイムアウトとリトライは `rssFeeds.ts` の `fetchWithRetry` (10 秒、5xx と例外だけ 2 回まで再試行、4xx は再試行しない) を参考にする
- **キャッシュ**: ニュース系のソースは `FeedFetchResult` (`{ items, cached }`) を返す。キャッシュの扱いは 2 通り
  - API 系 (`qiitaApi.ts` / `zennApi.ts` / `*Trending.ts`): `cache.ts` の `fetchWithFeedCache` に取得関数とパース関数を渡す。取得に失敗したら 7 日以内の前回分 (last-good) を返す。新しいソースは基本こちらを使う
  - RSS (`rssFeeds.ts`): `readFeedCache` / `writeFeedCache` を直接使い、ETag / Last-Modified の条件付きリクエストと last-good を両方扱う
  - `hackerNews.ts` (クエリ検索) はキャッシュを使わない
- **エラー**: モジュール内で握りつぶさずに throw する。`collect.ts` の `safeFeed` が受けて空配列にし、`health.log` に記録する。JSON のパースには `sources/popularity.ts` の `parseJsonOr` を使うと、どのソースが壊れた応答を返したかがエラーに残る
- **パースは純粋関数に分ける**: `parseArxivApiXml` / `parseAPSXml` のように、文字列を受けて配列を返す関数を export しておくと、ネットワーク無しでテストできる

### 新しいソースを足す手順

RSS を 1 本足すだけなら `config.ts` の `RSS_FEEDS` に 1 行足せば済む (README の fork 手順を参照)。新しい種類のソースを足すとき:

1. **利用規約・`robots.txt`・配信ポリシーを確認する** (機械取得・転載・表示形態の制限)。結果は `config.ts` のコメントと PR の説明に残す。既存の例は `VENUE_ACCEPTED_LISTS` や `JOURNALS` の上のコメント
2. `sources/{name}.ts` を書く (上の決まりに従う)
3. `config.ts` に設定 (クエリ・タグ・URL) を足す
4. `collect.ts` の `collectNews` / `collectPapers` / `collectTrending` のどれかに組み込む。`safeFeed` / `safe` で包む
5. `scoreModel.ts` の判定を見直す。`sourceTier` (言語 tier)、`popularityScore` (人気指標の正規化)、`isPopularityOnly` (キーワード照合をするか) は `source` の接頭辞で分岐している
6. web の `apps/web/app/components/shared/lib/sources.ts` に表示名 (`sourceLabel`)・系統 (`sourceFamily`)・色を足す
7. パーサのテストを `sources/{name}.test.ts` に足す ([development.md のテスト](./development.md#テスト))

## レート制限

外部 API の制限は、規約に書かれた値に合わせて待ち時間を入れている。新しい呼び出しを足すときは、同じ相手を叩く既存の箇所と直列になっているか確認する。

| 相手 | 間隔 | 定義場所 |
|---|---|---|
| arXiv API | 3 秒に 1 回・同時 1 本 | `collect.ts: ARXIV_REQUEST_INTERVAL_MS`、`venues/index.ts: ARXIV_INTERVAL_MS` |
| 会議の採択リストページ | 同じホストに 10 秒以上空ける (focs.computer.org の Crawl-delay) | `venues/index.ts: ACCEPTED_LIST_HOST_INTERVAL_MS` |
| Crossref REST API | 1.1 秒間隔・逐次 | `venues/index.ts: CROSSREF_INTERVAL_MS` |
| その他 (RSS / Qiita / Zenn / HN / APS / OG 画像) | 並列に取る | — |

arXiv の待ち時間は実行時間に直結する。`ARXIV_CATEGORIES` や `VENUE_MATCH_MAX_PER_RUN` を増やすと、workflow の `timeout-minutes` (25 分) に近づく。

## 会議採択論文と論文誌 (`venues/`)

arXiv 新着とは別枠の「採択論文・論文誌」セクションを作る。入口は `venues/index.ts` の `collectVenueItems`。

| ファイル | 役割 |
|---|---|
| `index.ts` | 全体の流れ。採択リストの取得 → arXiv comments 検索 → arXiv 照合 → 採点 → 要約 → 論文誌 → 枠の選抜 |
| `acceptedList.ts` | 採択リストページのパース。`html` / `wp-json` は「見出し → タイトル行と著者行の交互」、`miniconf` は NeurIPS 系サイトの `<noscript>` 版一覧 |
| `arxivComments.ts` | arXiv comments 欄の採択表記 ("To appear in SODA 2027") の判定。投稿中・ワークショップの表記は除く |
| `match.ts` | 採択リストの 1 本を arXiv のタイトル語検索で探す |
| `titles.ts` | タイトル・著者の正規化と同一論文の判定 (Jaccard 類似度) |
| `gate.ts` | 採択数が多い会議 (`gated: true`) で保存する論文の条件 |
| `journals.ts` | Crossref と ECCC のパース |
| `store.ts` | `data/venues/{slug}.json` の読み書き |

### 会議を足す

- **採択リストが取れる会議**: `config.ts` の `VENUE_ACCEPTED_LISTS` に足す。ページの形式が既存の 3 種類のどれでもなければ `acceptedList.ts` にパーサを足し、`venues.test.ts` に実際のページと同じ構造の fixture でテストを書く。採択数が数千なら `gated: true`、ページが重ければ `refetchDays`
- **リストが取れない会議**: `VENUE_COMMENT_VENUES` に足すと、arXiv comments の採択表記で拾う。採択数が多い会議は `gated: true`
- **論文誌**: `JOURNALS` に足す。ISSN は `https://api.crossref.org/journals/{issn}` で確認する。分野のトップ誌でキーワードに関係なく残したいものは `important: true`

採択リストのページは前年の内容が残っていることがあるので、見出しの年を検証している。新しいパーサでも同じ確認をする。
