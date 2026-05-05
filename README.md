# daily-news

自分用デイリーニュースサイト。GitHub Actions で毎朝 (JST 07:00) ニュースと論文を巡回・スコアリングし、論文を OpenAI で日本語要約して `data/YYYY-MM-DD.json` に保存。Next.js + Vercel で閲覧する。

## 構成

- `packages/shared` — 型定義
- `packages/pipeline` — TypeScript で書いた収集・スコア・要約パイプライン
- `apps/web` — Next.js 15 (App Router) + Tailwind
- `data/` — 日次の JSON（Action がコミットする成果物）
- `.github/workflows/daily.yml` — 毎朝の cron ＋手動実行

## ソース

`packages/pipeline/src/config.ts` で設定。

- **Qiita API** (`QIITA_API_TAGS`): rust / python / claude / 自作キーボード / アルゴリズム / 競技プログラミング / 量子コンピュータ — `likes_count` を取得
- **Zenn 非公式 API** (`ZENN_API_TOPICS`): rust / python / claude / 自作キーボード / algorithm / 競技プログラミング / quantum — `liked_count` を取得
- **日本語ブログ** (RSS): Greenkeys, TALPKEYBOARD BLOG, Nazology
- **英語一次情報・科学ニュース** (RSS): PEP RSS, Rust Blog, Inside Rust Blog, This Week in Rust, Google Research, Shtetl-Optimized, Quanta Magazine
- **Hacker News** (Algolia Search API, `HN_QUERIES`): claude / anthropic / rust / python / mechanical keyboard / qmk / zmk / combinatorial optimization / quantum computing / quantum algorithm / algorithm
- **arXiv** (`ARXIV_CATEGORIES`): cs.DS / cs.CC / math.OC / math.CO / quant-ph / cs.AI / cs.LG

## スコアリングとランキング

ニュース item は 2 バケットに分けて別々に上位 N 件を採用する:

- **popular バケット** (Qiita / Zenn) — `likes_count` を生値でスコアにし、キーワードマッチは行わない。降順で `NEWS_POPULAR_TOP_N` (= 20) 件。
- **other バケット** (RSS / Hacker News) — `KEYWORD_WEIGHTS` を記事タイトル + 概要に当てて加算したキーワードスコアと `RSS_FEEDS` の `baseScore` の合計で降順。`NEWS_OTHER_TOP_N` (= 5) 件。`baseScore` は更新頻度が低いサイトほど高く設定し (PEP=15, Shtetl-Optimized=15, Rust 公式・TALPKEYBOARD・TWIR=12, Greenkeys=5 ほか)、稀に投稿される一次情報が埋もれないようにしている。github.com 直リンクはタグごとに最高スコア 1 件まで (HN 由来のレポ紹介で枠が埋まるのを防ぐ)。

論文 (arXiv) はキーワードスコア降順で `PAPERS_TOP_N` (= 5) 件を採用し、`OPENAI_MODEL` (gpt-4o-mini) で日本語要約。

ニュースは `NEWS_MAX_AGE_HOURS` (= 168 時間 / 7 日) 以内に発行された item のみ採用し、過去 `NEWS_SEEN_LOOKBACK_DAYS` (= 7 日) の bundle に出た記事は除外。論文は arXiv RSS が土日に空配信になるため、当日 0 件のときは直近の bundle から論文を引き継いで表示する。

## Web UI

- 要約 (`.ed-summary`) は 3 行クランプ表示。クリック / Enter / Space で全文展開・折りたたみ (`apps/web/app/components/ExpandableSummary.tsx`)。
- 日付ナビ、タグページ、検索、テーマ切替を提供。

## ローカル実行

```bash
pnpm install
# 型チェック
pnpm typecheck
# パイプライン実行（OPENAI_API_KEY が無いと要約は abstract 冒頭で代替）
OPENAI_API_KEY=sk-... pnpm pipeline
# Web 開発サーバー
pnpm web:dev
# プロダクションビルド
pnpm web:build
```

## デプロイ

1. GitHub にプッシュ
2. Vercel で `apps/web` をルートとしてインポート（Build Command: `pnpm web:build`、Install Command: `pnpm install`、Output: `.next`）
3. リポジトリの **Settings → Secrets → Actions** に `OPENAI_API_KEY` を登録
4. Actions タブから `daily-news` ワークフローを `workflow_dispatch` で手動実行して `data/` の自動コミットを確認

push のたびに Vercel が自動再デプロイ → 当日分が公開される。

## 拡張

- 新しい RSS ソース（個人ブログなど）は `RSS_FEEDS` に 1 行追記
- Qiita / Zenn のトピックは `QIITA_API_TAGS` / `ZENN_API_TOPICS` に追記
- 新しいスコアキーワードは `KEYWORD_WEIGHTS` / `PAPER_KEYWORDS` に追記
- arxiv カテゴリは `ARXIV_CATEGORIES` に追記
- 採用件数は `NEWS_POPULAR_TOP_N` / `NEWS_OTHER_TOP_N` / `PAPERS_TOP_N` で調整
