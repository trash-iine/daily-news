# CLAUDE.md

このファイルは Claude (Claude Code 等) が daily-news リポジトリで作業するときの行動指針。プロジェクトの全体像・ソース一覧・スコアリング方針・デプロイ手順は [`README.md`](./README.md) に書いてあるので、まずそちらを読むこと。ここでは「どこを触るか」「何に気をつけるか」だけ短く整理する。

## ディレクトリの歩き方

- `apps/web/` — Next.js 15 (App Router) + Tailwind の閲覧 UI。`app/` がページ、`app/components/` が UI、`lib/data.ts` が `data/*.json` の読み込み。
- `packages/pipeline/` — RSS / Qiita / Zenn / Hacker News / arXiv の収集・スコアリング・要約。`src/main.ts` が本体、`src/sources/*.ts` が各ソース実装。
- `packages/pipeline/src/config.ts` — **設定ハブ**。フィード一覧・キーワード重み・件数・タグ別名はすべてここ。チューニングはほぼこのファイルで完結する。
- `packages/shared/` — 共有型 (`types.ts`) と big tag グループ定義 (`big-tag-groups.ts`)。
- `data/` — 日次 JSON (`YYYY-MM-DD.json`) と `index.json`。**GitHub Actions の自動コミット成果物**。
- `.github/workflows/daily.yml` — 毎日 22:00 UTC (07:00 JST) に `pnpm pipeline` を回して `data/` をコミットする cron。

## よく使うコマンド

| コマンド | 用途 |
|---|---|
| `pnpm install` | 依存導入 |
| `pnpm typecheck` | 全ワークスペースの型チェック (`tsc --noEmit`) |
| `pnpm --filter @daily-news/pipeline test` | スコアリングのユニットテスト (Node native test runner) |
| `pnpm web:dev` | Next.js 開発サーバー (`http://localhost:3000`) |
| `pnpm web:build` | Web 本番ビルド |
| `pnpm pipeline` | パイプライン実行（後述の注意あり） |

`pnpm pipeline` は **OpenAI API (gpt-4o-mini) と外部 RSS / API を実際に叩く**。ローカルで気軽に走らせない。やむを得ず実行する場合は `OPENAI_API_KEY` を渡す（未設定なら abstract 冒頭で代替され、要約は出ない）。

## 典型的な変更タスクの導線

| やりたいこと | 触る場所 |
|---|---|
| 新しい RSS ソース追加 | `packages/pipeline/src/config.ts` の `RSS_FEEDS` に 1 行追加 |
| Qiita / Zenn のトピック追加 | 同 `QIITA_API_TAGS` / `ZENN_API_TOPICS` |
| Hacker News クエリ追加 | 同 `HN_QUERIES` |
| arXiv カテゴリ追加 | 同 `ARXIV_CATEGORIES` |
| キーワード重み調整 | 同 `KEYWORD_WEIGHTS`（ニュース）/ `PAPER_KEYWORDS` / `PAPER_PRIORITY_KEYWORDS`（論文） |
| 採用件数調整 | 同 `NEWS_TOP_N` / `NEWS_MIN_PER_GROUP` / `NEWS_TRENDING_TOP_N` / `PAPERS_TOP_N` |
| タグ正規化 | 同 `TAG_ALIASES` |
| big tag グループ追加・並び替え | `packages/shared/src/big-tag-groups.ts` |
| Web UI 変更 | `apps/web/app/`(ページ) / `apps/web/app/components/`(コンポーネント) |
| データ読み込みロジック | `apps/web/lib/data.ts` |

## 守ってほしい規約

- **外部ソース追加前に利用規約を確認する**。`RSS_FEEDS` / `sources/` への新規 RSS フィード・未公開 API・スクレイピング対象の追加時は、コードを書く前に対象サイトの利用規約・`robots.txt`・RSS 配信ポリシーを読み、機械取得 / 転載 / 表示形態に制限が無いことを確認する。確認結果はプラン or PR 説明に簡潔に残す。Qiita / Zenn / Hacker News / arXiv は確認済みのため対象外。
- **`data/YYYY-MM-DD.json` と `data/index.json` は手で編集しない**。GitHub Actions が生成・コミットするファイル。再生成したい場合は Actions の `workflow_dispatch` を使う。
- **`data/.cache/` は触らない**。Actions のフィード HTTP キャッシュ復元先。
- **`.env*` / `OPENAI_API_KEY` をコミットしない**。本番のキーは GitHub Secrets で管理されている (`.gitignore` 済み)。
- **コミットメッセージのプレフィクス** は既存に合わせる: `FEAT:` / `FIX:` / `CHORE:` / `UPGRADE:` / `REMOVE:` / `data:` (`data:` は Actions 専用)。

## 検証手順

| 変えたもの | 走らせるもの |
|---|---|
| 設定・型 | `pnpm typecheck` |
| `score.ts` などのスコアリングロジック | `pnpm --filter @daily-news/pipeline test` |
| Web UI | `pnpm web:dev` でブラウザ確認 → 必要に応じて `pnpm web:build` |
| パイプライン全体 | 原則ローカル実行は避ける。本番確認は GitHub Actions の `workflow_dispatch` |

## 環境前提

- Node >= 20 / pnpm@10.33.2（ルート `package.json` の `engines` / `packageManager` で固定）
- lint / formatter は未設定。コードスタイルは周辺ファイルに合わせる。
- `.claude/settings.local.json` で `pnpm typecheck *` の Bash 実行が許可済み。
