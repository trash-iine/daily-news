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

- Qiita: 人気記事フィード + タグ別フィード (rust / python / claude / 自作キーボード)
- Zenn: 全体フィード + トピック別フィード (rust / python / claude / 自作キーボード)
- 日本語キーボードブログ: Greenkeys, TALPKEYBOARD BLOG
- 英語一次情報: PEP RSS, Rust Blog, Inside Rust Blog, This Week in Rust
- arXiv: cs.DS / cs.CC / math.OC / math.CO / quant-ph / cs.AI / cs.LG

スコアリングは `KEYWORD_WEIGHTS`（ニュース）と `PAPER_KEYWORDS`（論文）の重みを記事タイトル + 概要に対して加算するシンプル方式。`RSS_FEEDS` の `baseScore` でフィード単位の底上げを設定し、更新頻度が低いサイトほど高くする (PEP=15, Rust 公式・TALPKEYBOARD・TWIR=12, Greenkeys=5, Qiita/Zenn=0)。これにより、稀に投稿される一次情報や専門ブログの記事が、Qiita/Zenn の高頻度ヒット記事に埋もれず上位に出る。

ニュースは `NEWS_MAX_AGE_HOURS`（既定 24 時間）以内に発行された item のみ採用する（arXiv の announceType="new" フィルタと対になる挙動）。論文は arXiv RSS が土日に空配信になるため、当日 0 件のときは直近の bundle から論文を引き継いで表示する。

## ローカル実行

```bash
pnpm install
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
- 新しいスコアキーワードは `KEYWORD_WEIGHTS` / `PAPER_KEYWORDS` に追記
- arxiv カテゴリは `ARXIV_CATEGORIES` に追記
