# Web (`apps/web`)

Next.js 15 (App Router) + Tailwind。`data/` の JSON をビルド時に読み、すべてのページを静的生成する。実行時にはファイルを読まないので、新しい日のデータを出すには再ビルド (= Actions の `data:` コミットで Vercel が再デプロイ) が要る。

## ルート

| パス | ファイル | 内容 |
|---|---|---|
| `/` | `app/page.tsx` | 最新日の Today / Recap |
| `/d/YYYY-MM-DD` | `app/d/[date]/page.tsx` | 指定日を初期表示にした同じ画面。直リンク専用で、UI からのリンクは無い。**直近 30 日 (`STATIC_DAYS`) だけ静的生成**し、それより古い日付は 404 (`dynamicParams = false`) |
| `/venues` | `app/venues/page.tsx` | 採択論文を集めた会議の一覧 |
| `/venues/{slug}` | `app/venues/[slug]/page.tsx` | 会議ごとの全採択論文 (関連度順)。`data/venues/*.json` のうち論文が 1 本以上ある slug だけ静的生成し、ほかは 404 |
| `/latest.json` | `app/latest.json/route.ts` | 最新日 1 日分の機械向け JSON ([data-format.md](./data-format.md#latestjson)) |

`/d/[date]` を直近 30 日に限っているのは、全日付をプリレンダすると「ページ数 × 1 ページのデータ量」でビルド出力が膨らみ続けるため。日付の移動はクライアントの状態で行うので、古い日付のページが無くても UI は困らない。

## データの読み込み (`lib/`)

| ファイル | 役割 |
|---|---|
| `lib/data.ts` | `getIndex` / `getBundle` / `getWindow` / `getClientWindow`。`data/` を `process.cwd()/../../data` から読む |
| `lib/recap.ts` | Recap タブの集計をサーバ側で済ませる (`buildRecap`) |
| `lib/venues.ts` | `data/venues/*.json` を読む (`getVenueLists` / `getVenueList`) |

**クライアントに渡すのは直近 7 日 (`DAY_WINDOW_DAYS`) の bundle と、Recap の集計結果だけ**。日次 JSON は毎日 1 つずつ増えるので、履歴をまるごと client component の props に渡すと、1 ページの RSC ペイロードが日数に比例して増え、さらに `/d/[date]` のページ数と掛け算になる。UI が日付として触るのは `buildWeekSlots` の月〜日の 7 日だけなので、渡す範囲もそれに合わせている。

- `getClientWindow` は `trending` (1 日 20KB 強) を落としてから渡す。`trending` を使うのは Recap の集計だけで、それはサーバ側で済む
- Recap は最大 60 日 (`RECAP_WINDOW_DAYS`) を読むが、集計結果と代表記事の一部のフィールド (`RecapItem`) だけを渡す
- `memoByKey` はビルド中にモジュールスコープで結果を使い回す。React の `cache()` は 1 ページのレンダー内でしか効かず、`/` と 30 日分の `/d/[date]` がそれぞれ 60 日分を読み直してしまうため。開発サーバでは `data/` を差し替えて確認できるよう、production のときだけ有効にしている

新しい表示のためにデータを足すときは、「サーバで集計して結果だけ渡せないか」「7 日の窓で足りるか」を先に考える。

## 画面の構成

Today / Recap の 2 タブ。スマホ版とデスクトップ版の**両方を SSR で描画し**、CSS (`globals.css` の `.viewport-mobile` / `.viewport-desktop`、境界は 1024px) で片方を隠す。タブ・表示中の日付・現在時刻は `AppRoot.tsx` がまとめて持つので、ウィンドウ幅をまたいでも状態は保たれる。

```
app/components/
  AppRoot.tsx    共有の状態と出し分け
  shared/        両レイアウトが使う部品
                 ArticleCard / ItemDetail / ItemMetaRow / KindSections / RecapScreen / SeriesCard /
                 badges / ScoreBar / ScoreBreakdown / PaperSummaryStruct / SummaryMarkdown /
                 TodayTabs / PaperLinkButton / ExternalLink
  shared/lib/    表示に依存しないロジック (下表)
  mobile/        スマホ: 下部タブバー + スワイプで日送り
                 MobileApp / TodayScreen / DayCarousel / DayPanel
                 atoms/navigation.tsx (TabBar)、atoms/today-controls.tsx (BigTagFilter / WeekStrip)
  desktop/       PC: 3 ペイン
                 DesktopApp / Sidebar (WeekRail を含む) / DayList / ListCard / DetailPane
```

**スマホ (< 1024px)**: Today は All / 論文 / ニュースのタブ、大タグフィルタ、月〜日の週ストリップ、左右スワイプで日送り。カードはタップで展開し、論文は構造化要約、「なぜ採択された?」の内訳 (`ScoreBreakdown`)、続いている話題 (`SeriesCard`) を出す。Recap は直近 7 / 14 / 30 日のタグの動き・大タグ別の件数・トレンド上位。

**PC (>= 1024px)**: 左サイドバー (ナビ・週カレンダー・大タグフィルタ) / 中央リスト / 右の詳細ペイン。カードのクリックは種類を問わず「右ペインで開く」。キーボードは `↑` / `↓` (`k` / `j`) で選択、`←` / `→` で日送り (週の中を巡回)、`Enter` で元記事を別タブで開く。Recap では詳細ペインを畳み、共有の `RecapScreen` を中央に出す。

### `shared/lib/`

| ファイル | 内容 |
|---|---|
| `today.ts` | Today の型と、月〜日の週スロット (`buildWeekSlots` / `ringNeighbor`) |
| `bundle.ts` | タブ・大タグごとの件数、日ごとの絞り込み |
| `bigTags.ts` | 大タググループの表示名と色。`BigTagGroup` を全部書かないと型エラーになる |
| `sources.ts` | `source` 文字列から表示名・系統・色を決める |
| `series.ts` | 「続いている話題」の判定 (`detectSeries`)。`/latest.json` と共有 |
| `trend.ts` | Recap の集計関数と `velocityScore` (pipeline の `scoreModel.ts` と同じ式) |
| `scoreColors.ts` | スコア 3 軸 (人気 / 興味 / 言語) の色。バッジと積み上げバーで共有 |
| `format.ts` | 日付・相対時刻・ホスト名などの整形 |
| `nav.ts` | トップレベルのナビ定義 |

## ビルド設定 (`next.config.mjs`)

- `transpilePackages: ["@daily-news/shared"]` と `webpack` の `extensionAlias`: shared パッケージはビルドせずに TS ソースのまま公開していて、中で `./types.js` のように NodeNext 形式の import を書いている。Next.js の webpack は workspace の TS に対して `.js` → `.ts` の解決をしないので、明示的に指定している
- `outputFileTracingRoot` を monorepo のルートにしている: ビルド時に `apps/web` の外にある `data/` を読むため

## 見た目を変えるとき

- 色の変数: `app/globals.css`。大タグの色は `shared/lib/bigTags.ts`、ソースの色は `shared/lib/sources.ts`
- サイトのタイトル: `app/layout.tsx`
- スマホと PC の両方に効く変更は `shared/` に入れる。片方だけに入れると幅を変えたときに表示が食い違う
- 確認は `pnpm web:dev` を開き、ブラウザの幅を 1024px の上下で切り替えて両方を見る
