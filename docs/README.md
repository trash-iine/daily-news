# 開発者向けドキュメント

daily-news の中身を変える人向けの資料。何が載るサイトか、どう動かしてデプロイするか、fork して自分用にする手順は、ルートの [README.md](../README.md) にある。

| ページ | 内容 |
|---|---|
| [architecture.md](./architecture.md) | 全体像。パッケージの関係、日次の流れ、パイプラインの処理段階、失敗したときの方針 |
| [data-format.md](./data-format.md) | `data/` の JSON の形と後方互換のルール、`data/.cache/`、`/latest.json` |
| [pipeline.md](./pipeline.md) | パイプラインのモジュール、スコアリング、ソースの書き方と足し方、レート制限、会議採択論文 |
| [web.md](./web.md) | ルート、データの読み込みと渡す範囲、画面の構成、ビルド設定 |
| [development.md](./development.md) | セットアップ、検証、テスト、コミットと PR、トラブル対応 |

## やりたいことから探す

| やりたいこと | 読むところ |
|---|---|
| RSS・タグ・クエリ・件数を調整する | [README の fork 手順](../README.md#他の人が自分用に使うときのカスタマイズ手順) (`packages/pipeline/src/config.ts` だけで済む) |
| 新しい種類のソースを足す | [pipeline.md の手順](./pipeline.md#新しいソースを足す手順) |
| 採点・採用の仕組みを知る / 変える | [pipeline.md のスコアリング](./pipeline.md#スコアリング) |
| 会議・論文誌を足す | [pipeline.md の会議採択論文](./pipeline.md#会議採択論文と論文誌-venues) |
| item にフィールドを足す | [data-format.md の後方互換](./data-format.md#後方互換のルール) → `packages/shared/src/types.ts` |
| 画面を変える | [web.md](./web.md) |
| 変更を確かめる | [development.md](./development.md#何を変えたら何で確かめるか) |
| 毎朝の実行が失敗した / 記事が出ない | [development.md のトラブル対応](./development.md#トラブル対応) |

Claude Code などのエージェント向けの短い行動指針は、ルートの [CLAUDE.md](../CLAUDE.md) にある。
