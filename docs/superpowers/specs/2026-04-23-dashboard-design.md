# Claude Code Usage Dashboard - Design Spec

## Overview

開発チーム（6〜20人規模）の各メンバーのClaude Code使用状況を可視化するダッシュボードWebアプリケーション。Claude Codeの設定（スキル、サブエージェント等）が現場で活用され、正しく機能しているかを認知し、改善に繋げることを目的とする。

## Goals

- チームリーダー/マネージャーがメンバーの活用度合いを把握できる（チーム全体ビュー）
- 各メンバーが自分の使い方を振り返って改善できる（個人詳細ビュー）
- 配布スキルの活用度を可視化し、未活用スキルを発見できる
- PRごとに使用されたスキルを追跡し、スキルの効果を測定できる
- トークン使用量をモデル別・プロジェクト別に把握できる

## Architecture

### System Components

```
┌─────────────────┐     ┌──────────────────────────────┐     ┌───────────┐
│  メンバーPC      │     │  Next.js App (k8s)           │     │  GitHub   │
│                 │     │                              │     │  OAuth    │
│  ~/.claude/     │──→  │  API Routes (データ受信)       │←──→│  API      │
│  collector CLI  │     │  Server Components (UI描画)    │     └───────────┘
│  (cron定期送信)  │     │  Drizzle ORM                 │
└─────────────────┘     │         ↓                    │
                        │  RDS PostgreSQL (AWS)        │
                        └──────────────────────────────┘
```

**3つのコンポーネント:**

- **Collector CLI** — npmパッケージ。各メンバーのマシンにインストールし、`~/.claude/` からデータを読み取ってAPIへ送信
- **Next.js App** — ダッシュボードUI + データ受信API。Dockerイメージとしてk8sにデプロイ
- **RDS PostgreSQL** — AWS上のマネージドPostgreSQL

## Data Model

詳細は `2026-04-23-domain-model.md` を参照。

### Tables

| テーブル | 内容 |
|---|---|
| **users** | メンバー情報（id, github_id, name, avatar_url, email, role） |
| **sessions** | Claude Codeセッション（user_id, project, branch, started_at, ended_at, session_kind） |
| **token_usages** | トークン消費（session_id, model, input_tokens, output_tokens, cache_tokens） |
| **skill_usages** | スキル使用記録（session_id, skill_name, invoked_at） |
| **subagent_usages** | サブエージェント使用（session_id, agent_type, tool_calls_count, tokens_used） |
| **repositories** | 管理対象リポジトリ（owner, name, url） |
| **pull_requests** | PR情報（repository_id, pr_number, branch, title, author, created_at, merged_at） |
| **pr_sessions** | PRとセッションの紐付け（pull_request_id, session_id） |
| **distributed_skills** | チームに配布しているスキルの登録簿（skill_name, description, registered_at） |

### Key Relationships

- PR↔Sessionはブランチ名照合による多対多の関連（pr_sessionsテーブルで結合）
- トークン使用量はモデル別（Opus, Sonnet等）に記録
- スキル使用は呼び出しごとに個別レコード

## UI Design

### Layout

サイドバーナビゲーション + メインコンテンツ。ヘッダーにユーザーアバターと期間セレクターを配置。

```
┌─────────┬────────────────────────────────────┐
│ Logo    │  Header (ユーザーアバター, 期間選択) │
├─────────┼────────────────────────────────────┤
│ Nav     │                                    │
│         │  メインコンテンツエリア              │
│ Dashboard│                                    │
│ Members │                                    │
│ Skills  │                                    │
│ PRs     │                                    │
│ Cost    │                                    │
│─────────│                                    │
│ Repo    │                                    │
│ Selector│                                    │
└─────────┴────────────────────────────────────┘
```

### Pages

#### Dashboard（チーム全体サマリー）
- KPIカード: アクティブセッション数、総トークン消費量、スキル呼び出し数
- メンバー別スキル活用率の横棒グラフ
- 日別セッション数・トークン使用量の折れ線グラフ
- よく使われているスキルTop10

#### Members（メンバー詳細）
- メンバー一覧テーブル（アバター、名前、直近アクティビティ、総トークン量）
- 詳細ページ: 使用推移チャート、スキル使用ランキング、プロジェクト別内訳

#### Skills（スキル活用分析）
- 配布スキル一覧と使用率のヒートマップ（スキル x メンバー）
- 未活用スキルのハイライト（distributed_skillsテーブルに登録されたスキルと実使用の差分）
- スキルごとのトレンド（時系列）
- スキル管理画面: 配布スキルの登録・編集

#### PRs（PR連携ビュー）
- サイドバーのリポジトリセレクターで対象リポジトリを切り替え
- PR一覧テーブル（PR番号、タイトル、作者、使用スキル数）
- PR詳細展開: 関連セッション一覧、使用スキル、消費トークン

#### Cost（コスト/トークン分析）
- モデル別トークン消費の積み上げ棒グラフ
- プロジェクト別・ユーザー別のコスト内訳テーブル
- 日別コスト推移

### Common UI Elements
- ヘッダーの期間セレクター（直近7日/30日/カスタム）で全画面のデータをフィルタ
- チャートライブラリは Recharts

## Collector CLI

### Overview

各メンバーのマシンから `~/.claude/` のデータを収集してダッシュボードAPIへ送信する軽量CLIツール。

```
パッケージ名: @claude-analysis/collector
実行方法:    npx @claude-analysis/collector sync
設定ファイル: ~/.claude-analysis.json
```

### Configuration

```json
{
  "serverUrl": "https://dashboard.example.com",
  "apiKey": "user-specific-token-issued-on-dashboard"
}
```

初回セットアップは `npx @claude-analysis/collector init` で対話的に設定。apiKeyはダッシュボードのプロフィール画面から発行。

### Data Sources

| 収集データ | ソース | 抽出内容 |
|---|---|---|
| セッション情報 | `~/.claude/sessions/*.json` | セッションID, 開始時刻, 作業ディレクトリ, ブランチ |
| トークン使用量 | `~/.claude/projects/*/` セッションJSONL | セッション内のモデル別input/output/cache tokens |
| スキル使用 | `~/.claude/projects/*/` セッションJSONL | スキル呼び出しイベントを抽出 |
| サブエージェント使用 | `~/.claude/projects/*/` サブエージェントディレクトリ | エージェントタイプ, ツール呼び出し数 |
| セッションメタデータ | `~/.claude/usage-data/facets/` | ゴール, カテゴリ, 成果評価 |

### Sync Mechanism

- **差分送信:** 前回同期時のタイムスタンプを `~/.claude-analysis.json` に記録し、新規・更新分のみ送信
- **バッチ送信:** 1リクエストで複数セッション分をまとめて送信
- **リトライ:** 送信失敗時は次回syncで再送信（未送信データをローカルキューに保持）

### Trigger Methods

**A) cron定期実行（推奨）**
```
0 */4 * * * npx @claude-analysis/collector sync
```

**B) Claude Codeフック連携**
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Exit",
      "command": "npx @claude-analysis/collector sync"
    }]
  }
}
```

### API Endpoint

```
POST /api/collect
Authorization: Bearer <apiKey>
Content-Type: application/json

{
  "sessions": [...],
  "tokenUsages": [...],
  "skillUsages": [...],
  "subagentUsages": [...]
}
```

サーバー側でブランチ名をもとにPRとの紐付けを非同期で実行。

## Tech Stack

| レイヤー | 技術 | 理由 |
|---|---|---|
| **フレームワーク** | Next.js 15 (App Router) | Server Components/Actions活用、フルスタック統合 |
| **言語** | TypeScript (strict) | 全レイヤー統一 |
| **UI** | shadcn/ui + Tailwind CSS v4 | 高品質コンポーネント、カスタマイズ性 |
| **チャート** | Recharts | React向け、shadcn/uiチャートコンポーネントと統合済み |
| **ORM** | Drizzle ORM | 型安全、軽量、PostgreSQL対応 |
| **DB** | RDS PostgreSQL | AWS完結、安定運用 |
| **認証** | Auth.js (NextAuth v5) | GitHub OAuth、セッション管理 |
| **バリデーション** | Zod | APIリクエスト/レスポンスの型安全なバリデーション |
| **Collector CLI** | TypeScript + Commander.js | CLIフレームワーク、npmパッケージ配布 |
| **コンテナ** | Docker (multi-stage build) | k8sデプロイ用軽量イメージ |
| **モノレポ** | Turborepo | dashboard app と collector CLI をワークスペース管理 |

## Project Structure

```
claude-analysis/
├── apps/
│   └── dashboard/          # Next.js ダッシュボードアプリ
│       ├── app/
│       │   ├── (auth)/     # 認証関連ページ
│       │   ├── dashboard/  # チーム全体サマリー
│       │   ├── members/    # メンバー詳細
│       │   ├── skills/     # スキル活用分析
│       │   ├── prs/        # PR連携ビュー
│       │   ├── cost/       # コスト分析
│       │   └── api/
│       │       └── collect/ # データ収集エンドポイント
│       ├── components/
│       ├── lib/
│       │   ├── db/         # Drizzle スキーマ & クエリ
│       │   └── auth/       # Auth.js 設定
│       └── Dockerfile
├── packages/
│   ├── collector/          # Collector CLI
│   │   ├── src/
│   │   │   ├── commands/   # init, sync コマンド
│   │   │   ├── parsers/    # ~/.claude/ データパーサー
│   │   │   └── client/     # API送信クライアント
│   │   └── package.json
│   └── shared/             # 共有型定義 (API schema, Zod types)
│       └── src/
├── turbo.json
├── package.json
└── docker-compose.yml      # ローカル開発用
```

## Authentication & Authorization

- GitHub OAuthでログイン（Auth.js v5）
- ダッシュボードにログインしたユーザーにAPIキーを発行
- Collector CLIはAPIキーで認証
- 初期スコープではロール制御は設けず、全ログインユーザーが全データを閲覧可能

## Data Update Frequency

- Collector CLIによる定期送信: 4時間おき（cron）またはセッション終了時（フック）
- ダッシュボードはページアクセス時にDB最新データを表示（Server Components）
- リアルタイム更新は初期スコープ外

## Out of Scope (v1)

- リアルタイムWebSocket更新
- ロールベースのアクセス制御（管理者 / 一般ユーザー）
- 会話内容の表示（プライバシー上、セッションメタデータのみ収集）
- アラート・通知機能
- データエクスポート機能
