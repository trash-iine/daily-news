# daily-news

自分用デイリーニュースサイト。GitHub Actions で毎朝 (JST 07:00) ニュースと論文を巡回・スコアリングし、論文を OpenAI で日本語要約して `data/YYYY-MM-DD.json` に保存。Next.js + Vercel で閲覧する。

## 構成

- `packages/shared` — 型定義と big tag グループ
- `packages/pipeline` — TypeScript で書いた収集・スコア・要約パイプライン
- `apps/web` — Next.js 15 (App Router) + Tailwind
- `data/` — 日次の JSON（Action がコミットする成果物）と `index.json`、`data/.cache/` (フィード HTTP キャッシュ)
- `.github/workflows/daily.yml` — 毎朝の cron (`0 22 * * *` UTC) + 手動実行 (`workflow_dispatch`)

## ソース

`packages/pipeline/src/config.ts` で設定。

- **Qiita API** (`QIITA_API_TAGS`): `rust` / `python` / `claude` / `自作キーボード` / `アルゴリズム` / `競技プログラミング` / `量子コンピュータ` / `数理最適化` — `likes_count` を取得して人気指標にする
- **Zenn 非公式 API** (`ZENN_API_TOPICS`): `rust` / `python` / `claude` / `自作キーボード` / `algorithm` / `競技プログラミング` / `quantum` / `optimization` — `liked_count` を取得
- **日本語 RSS**: Greenkeys (自作キーボード) / TALPKEYBOARD BLOG / Nazology (科学ニュース) / typica.jp (コーヒー) / cafict.com (コーヒー)
- **英語 RSS**: PEP RSS / Rust Blog / Inside Rust Blog / This Week in Rust / Google Research / Shtetl-Optimized / Quanta Magazine
- **Hacker News** (Algolia Search API, `HN_QUERIES`): `claude` / `anthropic` / `rust` / `python` / `mechanical keyboard` / `qmk` / `zmk` / `ergonomic keyboard` / `split keyboard` / `combinatorial optimization` / `quantum computing` / `quantum algorithm` / `algorithm` / `dynamic programming` / `np hard`
- **arXiv** (`ARXIV_CATEGORIES`): `cs.DS` / `cs.CC` / `math.OC` / `math.CO` / `quant-ph` / `cs.AI` / `cs.LG`

各 RSS は `RssFeedConfig` で `baseScore` / `lang` / `important` を持ち、更新頻度が低い一次情報ほど `baseScore` を高く設定して埋もれを防ぐ (PEP=15, Shtetl-Optimized=15, Rust 公式・TWIR・TALPKEYBOARD・コーヒー系=12, Greenkeys・Google Research=5, Quanta Magazine・Nazology=0)。

## スコアリングとランキング

### ニュース

1 つの全体ランキングに統一されており、各 item に対して以下の 2 段階スコアを計算する:

- `merit  = popularity + kwScore`
  - `popularity` — Qiita / Zenn は `likes_count` を sqrt スケール圧縮 (`round(3 * sqrt)`)、Hacker News は points を `pointsToBaseScore` で sqrt 正規化 (cap 15)、RSS は `baseScore` をそのまま
  - `kwScore` — `KEYWORD_WEIGHTS` をタイトル + 概要にマッチさせた重み合計 (Qiita / Zenn は API のタグ自体を信頼してキーワード照合をスキップ)
- `score  = merit + LANGUAGE_BONUS[tier]`
  - `tier 0` (日本語ソース全般): `+15`
  - `tier 1` (英語の重要・低頻度ソース、`important: true`): `+5`
  - `tier 2` (それ以外の英語、HN 等): `+0`

採用ロジック (`rankNews`):

1. 過去 `NEWS_MAX_AGE_HOURS` (= 168 時間 / 7 日) 以内に発行
2. URL 重複除外 + 過去 `NEWS_SEEN_LOOKBACK_DAYS` (= 7 日) の bundle に出た記事を除外
3. `NEGATIVE_KEYWORDS` (`sponsored` / `アフィリエイト` / `プロモーション` / `pr記事`) を含む item を除外
4. `merit >= NEWS_SCORE_THRESHOLD` かつ canonical タグが `BIG_TAG_GROUPS` に属する item のみ残す (`BIG_TAG_GROUPS` に無いタグの item は採用候補から落ちる)
5. github.com 直リンクは canonical タグごと最高スコア 1 件まで (HN 由来のレポ紹介で同タグが埋まるのを防ぐ)
6. **大タグ別の最低枠**: `BIG_TAG_GROUPS` (`language` / `ai` / `algorithm` / `hobby`) の各グループから最低 `NEWS_MIN_PER_GROUP` (= 1) 件を確保
7. 残り枠は全体 `score` 降順で `NEWS_TOP_N` (= 25) 件まで埋める

`LANGUAGE_BONUS` は順位付けのみに効かせ、`merit` の閾値判定には使わない（低品質記事が bonus だけで通過しない設計）。

### 論文

`PAPER_KEYWORDS` をタイトル + abstract に当てたスコアで降順、`PAPER_PRIORITY_KEYWORDS` (`np-hard` / `np hard`) を含むものを最優先、`PAPERS_TOP_N` (= 5) 件を採用し、`OPENAI_MODEL` (gpt-4o-mini) で日本語要約。`announceType === "new"` のみ採用 (cross-listing / replace は除外)。

arXiv RSS が空配信となる日 (土日など、当日 publish された論文が無い日) は論文セクションを空のまま出力する。

### サムネイル

採用後に各 item の URL を Open Graph スクレイプで取得し (`thumbnail.ts`、並列度 8)、ヒットした分だけ JSON に `thumbnail` を入れる。

## Web UI

- 要約 (`.ed-summary`) は 3 行クランプ表示。クリック / Enter / Space で全文展開・折りたたみ (`apps/web/app/components/ExpandableSummary.tsx`)
- 日付ナビ (`DateStepper`)、`/tags/` のタグ別一覧、検索 (`SearchableList`)、テーマ切替 (`ThemeToggle`) を提供
- スコアバー (`ScoreBar`) と big tag グループによる色分け (`Masthead` / `EditorialItem`)

## ローカル実行

```bash
pnpm install
# 型チェック
pnpm typecheck
# パイプラインのユニットテスト (score.test.ts)
pnpm --filter @daily-news/pipeline test
# パイプライン実行（OPENAI_API_KEY が無いと要約は abstract 冒頭で代替）
OPENAI_API_KEY=sk-... pnpm pipeline
# Web 開発サーバー
pnpm web:dev
# プロダクションビルド
pnpm web:build
```

実行環境: Node `>=20` / pnpm `10.33.2` (root `package.json` で固定)。

## デプロイ

1. GitHub にプッシュ
2. Vercel で `apps/web` をルートとしてインポート（Build Command: `pnpm web:build`、Install Command: `pnpm install`、Output: `.next`）
3. リポジトリの **Settings → Secrets → Actions** に `OPENAI_API_KEY` を登録
4. Actions タブから `daily-news` ワークフローを `workflow_dispatch` で手動実行して `data/` の自動コミットを確認

push のたびに Vercel が自動再デプロイ → 当日分が公開される。

---

## 他の人が自分用に使うときのカスタマイズ手順

このリポジトリは趣味嗜好（Rust / Python / Claude / 自作キーボード / 競技プログラミング / 量子コンピュータ / 数学 / コーヒー）に強くチューニングされている。fork して自分用に作り変える場合の手順:

### 1. fork して clone

```bash
gh repo fork Trash-iine/daily-news --clone
cd daily-news
pnpm install
```

### 2. 興味のあるソースを差し替える (`packages/pipeline/src/config.ts`)

| 配列 | 役割 | 差し替え方 |
|---|---|---|
| `QIITA_API_TAGS` | Qiita のタグ別人気記事 | 自分が追っている Qiita タグに置き換え |
| `ZENN_API_TOPICS` | Zenn のトピック別人気記事 | 自分が追っているトピックに置き換え |
| `HN_QUERIES` | Hacker News の検索クエリ | 興味のキーワードを英語で並べる |
| `ARXIV_CATEGORIES` | arXiv カテゴリ | [arxiv.org/category_taxonomy](https://arxiv.org/category_taxonomy) を見て選ぶ |
| `RSS_FEEDS` | 個人ブログ・公式ブログの RSS | 下記の手順で 1 行ずつ追加 |

`RSS_FEEDS` に追加するときは:

```ts
{ id: "my-feed", url: "https://example.com/feed", baseScore: 12, lang: "en", important: true }
```

- `id` — 短い英数字の識別子。`source: "rss:my-feed"` として item に残る
- `baseScore` — 更新頻度が低いほど大きく (15: <1/週、12: 1-2/週、5: 5-10/週、0: 高頻度)
- `lang: "ja" | "en"` — 言語ボーナスの判定に使う
- `important: true` — 英語ソースで「重要・低頻度の一次情報」として優先したい場合のみ。日本語は `lang: "ja"` で常に最優先 tier なので不要

> ⚠️ **新しい RSS / 未公開 API を追加するときは、対象サイトの利用規約 / `robots.txt` / RSS 配信ポリシーを必ず先に確認する**こと（機械取得・転載・表示形態に制限がないか）。確認結果は PR 説明やコミットメッセージに簡潔に残す。

### 3. キーワード重みを自分の興味に合わせる (`KEYWORD_WEIGHTS`)

タイトル + 概要に対して照合され、ヒットした重みの合計が `kwScore` になる:

```ts
export const KEYWORD_WEIGHTS: Record<string, number> = {
  "machine learning": 5,
  "diffusion model": 4,
  "深層学習": 5,
  // ...
};
```

仕様:

- ASCII 文字列は `\b` 単語境界で照合（`math` は `mathematics` にマッチしない → 別エントリが必要）
- 非 ASCII（日本語など）は部分一致
- 重みの目安: 強関心 5 / 中関心 3-4 / 文脈ヒント 2 / 弱い 1
- タイトル一致は `score.ts` 内で本文一致より重く加算される

論文用は `PAPER_KEYWORDS` を別途編集（abstract に当てるので長めの英語キーワード向き）。最優先したいキーワードは `PAPER_PRIORITY_KEYWORDS` に。

不要記事を弾くなら `NEGATIVE_KEYWORDS` (`sponsored`, `アフィリエイト` 等) も調整。

### 4. タグ正規化と大タググループを更新する

`KEYWORD_WEIGHTS` のキーは canonical 化されてから item の `tags[]` に入る。

- `TAG_ALIASES` (`packages/pipeline/src/config.ts`) — 表記ゆれを 1 つの canonical タグに寄せる (`mechanical keyboard` → `キーボード` など)
- `BIG_TAG_GROUPS` (`packages/shared/src/big-tag-groups.ts`) — canonical タグを `language` / `ai` / `algorithm` / `hobby` のどれかに振る。**ここに無い canonical タグの item は news 採用候補から外れる**ので注意
- `BIG_TAG_GROUP_ORDER` — 最低枠を埋めていく順序。優先度の高いグループを左に

例: ML 系を充実させたいなら `BIG_TAG_GROUPS` のキーに `ml`, `cv`, `nlp` を `"ai"` で追加し、`KEYWORD_WEIGHTS` / `TAG_ALIASES` 側でそれらの canonical 名に寄せる。

### 5. 件数・採用条件を調整する

| 定数 | 役割 |
|---|---|
| `NEWS_TOP_N` | 1 日に採用する news 件数 (デフォルト 25) |
| `PAPERS_TOP_N` | 1 日に採用する論文件数 (デフォルト 5) |
| `NEWS_MIN_PER_GROUP` | 各 BIG_TAG_GROUP からの最低採用件数 (デフォルト 1) |
| `NEWS_MAX_AGE_HOURS` | 古すぎる記事を除外する時間窓 (デフォルト 168h = 7 日) |
| `NEWS_SEEN_LOOKBACK_DAYS` | 過去何日の bundle と被った記事を除外するか (デフォルト 7 日) |
| `NEWS_SCORE_THRESHOLD` / `PAPER_SCORE_THRESHOLD` | merit がこれ未満なら不採用 (デフォルト 1) |
| `LANGUAGE_BONUS` | 日本語/英語重要/その他の言語ボーナス。日本語を優先したくない場合は 0 / 0 / 0 にする |
| `OPENAI_MODEL` | 論文要約に使うモデル (デフォルト `gpt-4o-mini`) |

### 6. シークレットとデプロイ

- GitHub: **Settings → Secrets and variables → Actions → New repository secret** で `OPENAI_API_KEY` を登録（無くてもパイプラインは動くが、論文要約が abstract 冒頭フォールバックになる）
- Vercel: 自分のアカウントで fork したリポジトリを import → Root Directory `apps/web` / Build Command `pnpm web:build` / Install Command `pnpm install` / Output `.next` でデプロイ
- 初回確認: GitHub Actions の `daily-news` ワークフローを `workflow_dispatch` で手動実行 → `data/YYYY-MM-DD.json` のコミットが入り、Vercel が自動再デプロイされる

### 7. UI / 見た目を変える

- ヘッダー文言・サイトタイトル: `apps/web/app/layout.tsx` / `apps/web/app/components/Masthead.tsx`
- カラーリング (big tag グループ別): `apps/web/app/globals.css` と各コンポーネント
- 要約展開挙動: `apps/web/app/components/ExpandableSummary.tsx`

### 8. パイプラインのテストを走らせる

スコアリングロジック (`score.ts`) を触ったら:

```bash
pnpm --filter @daily-news/pipeline test
```

設定変更だけなら `pnpm typecheck` で十分。

## 拡張・チューニングのヒント

- `data/.cache/health.log` (JSON Lines) に各フィードの取得結果 (`ok` / `cached` / `failed`) が残るので、長期で取れていないフィードを発見しやすい
- 既存のソースを残したまま自分の興味を追加していくと、ランキングが偏るので使わない `KEYWORD_WEIGHTS` / `BIG_TAG_GROUPS` エントリは削除推奨
- arXiv の API ToU により 1 リクエスト/3 秒のレートリミットを `main.ts` で守っている。`ARXIV_CATEGORIES` を増やすと所要時間が線形に伸びる点に注意 (15 分の `timeout-minutes` を超えないように)
