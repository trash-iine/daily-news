# データ形式

`data/` 以下のファイルは GitHub Actions が生成してコミットする成果物で、**手で編集しない** (再生成は `workflow_dispatch`)。型の定義は `packages/shared/src/types.ts` にあり、このページはその解説。食い違ったら `types.ts` が正しい。

```
data/
  index.json             DailyIndex       存在する日付の一覧
  YYYY-MM-DD.json        DailyBundle      1 日分 (JST の日付)
  venues/{slug}.json     VenueList        会議 1 回分の採択論文 (例: focs-2026.json)
  .cache/                (git 管理外)      フィードの HTTP キャッシュと取得ログ
```

## 後方互換のルール

`BaseItem` などのフィールドは機能を足すたびに増えてきた。古い日付の JSON は書き直さないので、**新しく足すフィールドは optional にし、web 側はそのフィールドが無くても動くように書く**。`types.ts` の JSDoc には「YYYY-MM-DD 以降の bundle に付与される」と付いた日付を書いておく (下の表もそれに従う)。

既存フィールドの意味や型を変えるのは避ける。どうしても変えるなら、web 側で新旧両方を読めるようにする (例: `big-tag-groups.ts` の `quantum` は旧タグ名を読むために残してある)。

## `index.json` — `DailyIndex`

```json
{ "dates": ["2026-11-27", "2026-11-26", "..."], "updatedAt": "2026-11-26T22:05:12.000Z" }
```

`dates` は新しい順。`store.ts` の `updateIndex` が当日を足して並べ直す。web の `lib/data.ts` は `index.json` が読めないとき `data/` を走査して代わりに作る。

## `YYYY-MM-DD.json` — `DailyBundle`

| フィールド | 型 | 説明 |
|---|---|---|
| `date` | `string` | JST の日付 |
| `generatedAt` | `string` | 書き出した時刻 (ISO 8601) |
| `items` | `BaseItem[]` | その日に採用した論文とニュース。`score` の降順 |
| `trending?` | `TrendingItem[]` | site-wide トレンドのスナップショット (2026-05-22〜)。Recap の集計にだけ使い、ページには渡さない |

### `BaseItem`

共通のフィールド:

| フィールド | 説明 |
|---|---|
| `id` | `hashId(url)` = URL の SHA-1 の先頭 16 桁。翌日以降の再掲を防ぐ照合にも使う。会議採択論文だけは、同じ論文が arXiv 新着にも出た日に衝突しないよう `hashId("{url}#{slug}")` |
| `kind` | `"news"` または `"paper"` |
| `title` / `url` | 表示名と元記事。論文は arXiv の abs ページ |
| `summary` | ニュースは本文冒頭 240 字。論文は要約の平文 (`summaryStruct` を結合したもの)、要約できなかったときは abstract 冒頭 |
| `tags` | canonical 化したタグ。トレンド枠の item は先頭に `TRENDING_TAG` (`"話題"`) が付く |
| `score` | 並び順に使う最終スコア。ニュースは `popularity + keywordScore + languageBonus`、論文はキーワード関連度、トレンド枠は velocity |
| `source` | どこから来たか (下の表) |
| `publishedAt` / `fetchedAt` | ISO 8601 |

optional のフィールド:

| フィールド | 付く対象 | 付き始めた日 | 説明 |
|---|---|---|---|
| `thumbnail` | 全般 | — | OG 画像の URL。取れたものだけ |
| `authors` | paper | — | 表示用の著者 (最大 3 名 + `+N`)。APS には付かない |
| `summaryStruct` | paper | 2026-05-27 | 構造化要約 `{ topic?, problem, method, result }`。`topic` は 2026-06-11〜 |
| `popularity` | 全般 | 2026-05-20 | ソースの人気指標を共通レンジに正規化した値 |
| `keywordScore` | 全般 | 2026-05-21 | キーワード一致の加点 |
| `languageBonus` | news | 2026-05-21 | 日本語 / 英語の重要ソース / その他 のボーナス |
| `matchedKeywords` | 全般 | 2026-05-21 | 一致した canonical キーワード |
| `popularityLabel` | news | 2026-05-21 | バッジ用の生値ラベル (`"Qiita LGTM 17"` など) |
| `venue` | paper | 2026-10-24 | 採択会議・掲載誌の表示名 (`"FOCS 2026"` / `"SIAM J. Comput."` / `"ECCC"`)。これがある論文は「採択論文・論文誌」セクションに出る |
| `venueSlug` | paper | 2026-10-24 | 会議採択論文のとき `/venues/{slug}` の slug。論文誌では無い |

### `source` の形式

| 値 | 由来 |
|---|---|
| `rss:{id}` | `RSS_FEEDS` の `id` |
| `qiita-api:{tag}` / `zenn-api:{topic}` | Qiita / Zenn のタグ別取得 |
| `hn:{query}` | Hacker News の検索クエリ |
| `qiita-trending` / `zenn-trending` / `hn-trending` | site-wide トレンド (トレンド枠と `trending[]`) |
| `arxiv:{category}` | arXiv の新着 (`cs.DS` など) |
| `aps:{id}` | APS (Physical Review) の RSS |
| `venue:{slug}` | 会議採択論文 (`venue:focs-2026`) |
| `journal:{id}` / `eccc` | 論文誌 (Crossref) / ECCC |

`source` の値によって採点の扱い (`packages/pipeline/src/scoreModel.ts`) と、web での表示名・色 (`apps/web/app/components/shared/lib/sources.ts`) が決まる。新しい形式を足すときは両方を見る。

### `TrendingItem`

興味タグで絞っていない、Qiita / Zenn / HN 全体の人気記事。`source`・`title`・`url`・`publishedAt`・`fetchedAt`・`popularity` (`BaseItem.popularity` と同じスケール)・`popularityRaw?` (Qiita / Zenn の生の数)・`tags` (HN は常に空)。1 日あたり 20KB を超えるので、web は Recap の集計 (`lib/recap.ts`) でだけ読み、クライアントには渡さない (`lib/data.ts` の `getClientWindow`)。

### 同じ日に 2 回実行したとき

`writeDaily` は既存のファイルを読み、`id` が同じ item は新しい方で上書きして**足し合わせる** (古い item は消えない)。`trending` を渡さなかった場合は既存の値を残す。手動で再実行すると、その日の item 数が通常より増えることがある。

## `venues/{slug}.json` — `VenueList`

会議 1 回分 (`{venue 小文字}-{year}`) の採択論文。採択リストのページや arXiv comments の採択表記から作られ、arXiv 版が見つかるたびに更新される。

| フィールド | 説明 |
|---|---|
| `slug` / `venue` / `year` / `name` | `"focs-2026"` / `"FOCS"` / `2026` / `"FOCS 2026"` |
| `sourceUrl?` / `sourceHash?` | 採択リストの取得元と、パース結果のハッシュ (変わったときだけマージし直す)。comments だけから作られたリストには無い |
| `sourceCheckedOn?` | 採択リストを最後に取った日。`refetchDays` を設定した会議だけが持つ |
| `gated?` / `sourceTotal?` | 関心キーワードで絞って保存しているか、と絞る前の件数 |
| `createdOn` / `updatedAt` | 作成日 (JST) と最終更新時刻 |
| `papers` | `VenuePaper[]` |

`VenuePaper` は `title`・`authors` (所属は落とす)・`arxivId?`・`arxivFoundOn?` (arXiv 版を初めて見つけた日。この日に Today の候補になる)・`score` / `matchedKeywords`・`summary?` / `summaryStruct?`・`via` (`"accepted-list"` か `"arxiv-comment"`)・`lastCheckedOn?` (最後に arXiv と照合した日)。

## `data/.cache/` (git 管理外)

Actions の `actions/cache` で実行をまたいで引き継ぐ。ローカルで `pnpm pipeline` を実行すると手元にもできる。**中身は手で触らない**。

- `feeds/{id}.json` — `FeedCacheEntry` (`cache.ts`)。最後に取れた items と取得時刻。取得に失敗したときは、7 日以内のものなら last-good として返す。RSS だけは `etag` / `lastModified` も持ち、次の取得で `If-None-Match` / `If-Modified-Since` を送って 304 ならそのまま使う。ファイル名は id の英数字と `._-` 以外を `_` に置き換えたもの (日本語のタグは `qiita-api______.json` のように `_` の並びになる。**同じ文字数の日本語タグを 2 つ足すとファイルが衝突する**ので注意)
- `health.log` — 取得 1 回ごとに 1 行の JSON Lines。`{ ts, id, status: "ok" | "cached" | "failed", count, ms, error? }`。長く取れていないフィードを探すのに使う ([development.md のトラブル対応](./development.md#トラブル対応))

## `/latest.json`

web が公開する、機械向けの読み口 (`apps/web/app/latest.json/route.ts`)。最新日 1 日分だけを返す。ビルド時に静的生成される。

```json
{
  "date": "2026-11-27",
  "generatedAt": "...",
  "counts": { "all": 31, "papers": 11, "news": 20 },
  "papers": [{ "title": "...", "url": "...", "source": "arxiv:cs.DS", "publishedAt": "...", "tags": ["..."] }],
  "news":   [{ "title": "...", "url": "...", "source": "...", "publishedAt": "...", "tags": ["..."] }],
  "series": [{ "tag": "rust", "ratio": 1.5, "days": [{ "date": "...", "title": "..." , "url": "..." }] }]
}
```

- `papers` / `news` は `score` の降順。要約や抜粋は載せない (外部の文章をそのまま含みうるため)。フィールドを足すときもこの方針を守る
- `series` は Today の「続いている話題」と同じ判定 (`shared/lib/series.ts` の `detectSeries`)。`title` / `url` はその日に該当 item が無ければ `null`
- データが無いときは `{ date: null, papers: [], news: [], series: [] }` を 404 で返す
