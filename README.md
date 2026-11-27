# daily-news

自分用デイリーニュースサイト。GitHub Actions で毎朝 (JST 06:43) ニュースと論文を巡回・スコアリングし、論文を OpenAI で日本語要約して `data/YYYY-MM-DD.json` に保存。Next.js + Vercel で閲覧する。

中身を変える人向けの資料は [`docs/`](./docs/README.md) にある (全体像・データ形式・パイプライン・Web・開発の進め方)。

## 構成

- `packages/shared` — 型定義と big tag グループ
- `packages/pipeline` — TypeScript で書いた収集・スコア・要約パイプライン
- `apps/web` — Next.js 15 (App Router) + Tailwind
- `data/` — 日次の JSON（Action がコミットする成果物）と `index.json`、`data/venues/` (会議ごとの採択論文リスト)、`data/.cache/` (フィード HTTP キャッシュ)
- `.github/workflows/daily.yml` — 毎朝の cron (`43 21 * * *` UTC = 06:43 JST) + 手動実行 (`workflow_dispatch`)

## ソース

`packages/pipeline/src/config.ts` で設定。

- **Qiita API** (`QIITA_API_TAGS`): `rust` / `python` / `claude` / `自作キーボード` / `アルゴリズム` / `競技プログラミング` / `量子コンピュータ` / `数理最適化` — `likes_count` を取得して人気指標にする
- **Zenn 非公式 API** (`ZENN_API_TOPICS`): `rust` / `python` / `claude` / `自作キーボード` / `algorithm` / `競技プログラミング` / `quantum` / `optimization` — `liked_count` を取得
- **日本語 RSS**: Greenkeys (自作キーボード) / TALPKEYBOARD BLOG / Nazology (科学ニュース) / typica.jp (コーヒー) / cafict.com (コーヒー)
- **英語 RSS**: PEP RSS / Rust Blog / Inside Rust Blog / This Week in Rust / Google Research / Shtetl-Optimized / Quanta Magazine / Thinky Games (パズルゲーム)
- **Hacker News** (Algolia Search API, `HN_QUERIES`): `claude` / `anthropic` / `rust` / `python` / `mechanical keyboard` / `qmk` / `zmk` / `ergonomic keyboard` / `split keyboard` / `combinatorial optimization` / `quantum computing` / `quantum algorithm` / `algorithm` / `dynamic programming` / `np hard`
- **arXiv** (Atom API, `ARXIV_CATEGORIES`): `cs.DS` / `cs.CC` / `math.OC` / `math.CO` / `quant-ph` / `cs.AI` / `cs.LG`
- **APS (Physical Review)** (`APS_FEEDS`): PRX Quantum / PRL / PRA / PRX / PRResearch — PRX Quantum 以外は量子関連キーワードを含む item のみ採用
- **会議の採択リスト** (`VENUE_ACCEPTED_LISTS`): STOC (acm-stoc.org) / FOCS (focs.computer.org の WordPress REST API) / NeurIPS・ICML・ICLR (会議サイト `/virtual/{year}/papers.html` の noscript 版タイトル一覧)。今年・来年の URL を毎日叩き、ページが公開された日にリストを取り込む。ML 会議は 1 MB 前後あるので取得後は 7 日おき (`refetchDays`)、採択数が数千なので関心キーワードに一致するタイトルだけ保存する (`gated`)
- **arXiv comments の採択表記** (`VENUE_COMMENT_VENUES`): "To appear in SODA 2027" / "AAAI-26" のような表記を arXiv API の `co:` 検索で拾う。SODA (siam.org は bot に 403) のようにリストを取れない会議の補完と、リスト公開前の早期検知を兼ねる。会議は 6 件ずつ OR でまとめて 1 クエリにし、併設ワークショップの論文は除く
  - 理論 / アルゴリズム: FOCS / STOC / SODA / ICALP / ITCS / ESA / APPROX / RANDOM / CCC / IPEC / STACS / SoCG / ISAAC / MFCS
  - 数理最適化 / OR: IPCO / CPAIOR / SEA / ATMOS、進化計算: GECCO / PPSN / EvoCOP、制約 / SAT: CP / SAT
  - 量子: QIP / TQC、形式検証: ITP / CPP / CAV
  - ML / AI (`gated`: タイトルが関心キーワードに一致するものだけ): NeurIPS / ICML / ICLR / AAAI / IJCAI
- **論文誌** (`JOURNALS`, Crossref REST API): DOI 登録日で新着を取る
  - 理論: J. ACM / SIAM J. Comput. / TALG / TheoretiCS / Combinatorica / SIAM J. Discrete Math. / Algorithmica
  - 数理最適化 / OR: Math. Programming / MPC / MOR / Operations Research / IJOC / INFORMS J. Optimization / EJOR / Computers & OR / SIAM J. Optimization / J. Combinatorial Optimization / Discrete Optimization / Optimization Letters / Networks / Transportation Science
  - メタヒューリスティクス / 進化計算: J. Heuristics / Evolutionary Computation / IEEE TEVC / Swarm and Evolutionary Computation
  - 制約 / AI: Constraints / JAIR / Artificial Intelligence
  - 量子: Quantum / npj Quantum Information / ACM TQC / IEEE TQE
  - 形式検証 / 論理: J. Automated Reasoning / ACM TOCL / LMCS
- **ECCC** (`ECCC_FEED_URL`): 計算量理論のプレプリント RSS

各 RSS は `RssFeedConfig` で `baseScore` / `lang` / `important` を持ち、更新頻度が低い一次情報ほど `baseScore` を高く設定して埋もれを防ぐ (PEP=15, Shtetl-Optimized=15, Rust 公式・TWIR・TALPKEYBOARD・コーヒー系=12, Greenkeys・Google Research=5, Quanta Magazine・Nazology=0)。

## スコアリングと画面

- **ニュース**: 人気指標 (いいね・points・フィードの重み) とキーワード一致で採点し、日本語ソースを優先して並べる。大タグ (`language` / `ai` / `algorithm` / `hobby` / `game`) ごとに最低枠を確保し、残りをスコア順に埋める。興味タグと関係なく勢いのある記事を「話題」枠として数件足す
- **論文**: arXiv / APS の新着をキーワードで採点して上位を採用し、OpenAI で日本語に構造化要約する。量子の論文は最低 1 本を保証する
- **採択論文・論文誌**: 会議の採択リストと arXiv comments の採択表記、論文誌の新着を追い、arXiv 版が見つかった日に Today に載せる。会議ごとの全件は `/venues/{slug}` で読める
- **Web**: Today / Recap の 2 タブ。スマホ (1 カラム + スワイプで日送り) と PC (3 ペイン + キーボード操作) を幅 1024px で切り替える。機械向けに最新日 1 日分を返す `/latest.json` がある

採点の式と採用の手順は [`docs/pipeline.md`](./docs/pipeline.md#スコアリング)、画面の構成は [`docs/web.md`](./docs/web.md) を参照。

## ローカル実行

```bash
pnpm install
# 型チェック
pnpm typecheck
# パイプラインのユニットテスト (packages/pipeline/src/**/*.test.ts)
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
- `BIG_TAG_GROUPS` (`packages/shared/src/big-tag-groups.ts`) — canonical タグを `language` / `ai` / `algorithm` / `hobby` / `game` のどれかに振る。**ここに無い canonical タグの item は news 採用候補から外れる**ので注意
- `BIG_TAG_GROUP_ORDER` — 最低枠を埋めていく順序。優先度の高いグループを左に

例: ML 系を充実させたいなら `BIG_TAG_GROUPS` のキーに `ml`, `cv`, `nlp` を `"ai"` で追加し、`KEYWORD_WEIGHTS` / `TAG_ALIASES` 側でそれらの canonical 名に寄せる。

### 5. 件数・採用条件を調整する

| 定数 | 役割 |
|---|---|
| `NEWS_TOP_N` | 1 日に採用する news 件数 (デフォルト 17) |
| `NEWS_TRENDING_TOP_N` | 興味タグ外から追加する「話題」枠の件数 (デフォルト 3) |
| `PAPERS_TOP_N` | 1 日に採用する論文件数 (デフォルト 5) |
| `PAPERS_QUANTUM_MIN` | quantum 系論文の最低採用件数 (デフォルト 1) |
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

- サイトタイトル・ヘッダー文言: `apps/web/app/layout.tsx` / `apps/web/app/components/mobile/TodayScreen.tsx`
- カラートークン: `apps/web/app/globals.css` (CSS 変数)。big tag グループ別の色・ラベルは `apps/web/app/components/shared/lib/bigTags.ts`、ソース別の色・表示名は同 `lib/sources.ts`
- カード表示・要約展開挙動: スマホは `apps/web/app/components/shared/ArticleCard.tsx`、PC は `apps/web/app/components/desktop/{ListCard,DetailPane}.tsx`
- スマホ / PC の切替境界: `apps/web/app/globals.css` の `.viewport-mobile` / `.viewport-desktop` (1024px)

### 8. パイプラインのテストを走らせる

スコアリングロジック (`score.ts`) を触ったら:

```bash
pnpm --filter @daily-news/pipeline test
```

設定変更だけなら `pnpm typecheck` で十分。

## 拡張・チューニングのヒント

- 既存のソースを残したまま自分の興味を足していくとランキングが偏るので、使わない `KEYWORD_WEIGHTS` / `BIG_TAG_GROUPS` のエントリは消すとよい
- `ARXIV_CATEGORIES` を増やすと、arXiv API の 3 秒間隔のぶん所要時間が線形に伸びる (workflow の `timeout-minutes` は 25 分)
- フィードが取れているかは `data/.cache/health.log` で見られる。詳しくは [`docs/development.md` のトラブル対応](./docs/development.md#トラブル対応)
