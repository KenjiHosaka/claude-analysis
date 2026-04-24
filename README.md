# Claude Analysis

開発チームのClaude Code使用状況を可視化するダッシュボード。スキル活用度、サブエージェント使用量、トークン消費量、PR単位のスキル追跡を提供する。

## 技術スタック

- **フレームワーク:** Next.js 15 (App Router)
- **言語:** TypeScript (strict)
- **UI:** shadcn/ui + Tailwind CSS v4
- **チャート:** Recharts
- **ORM:** Drizzle ORM
- **DB:** PostgreSQL
- **認証:** Auth.js v5 (GitHub OAuth)
- **モノレポ:** Turborepo + pnpm

## プロジェクト構成

```
claude-analysis/
├── apps/dashboard/       # Next.js ダッシュボードアプリ
├── packages/collector/   # データ収集CLI
└── packages/shared/      # 共有型定義・Zodスキーマ・モデル単価
```

## ローカル開発

### 前提条件

- Node.js 22+
- pnpm 9+
- Docker (PostgreSQL用)

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# PostgreSQL起動
docker compose up -d

# 環境変数の設定
cp .env.example apps/dashboard/.env.local

# DBスキーマの適用
pnpm db:push

# サンプルデータの投入
pnpm db:seed
```

### 起動

```bash
pnpm dev
```

http://localhost:3000 でダッシュボードにアクセスできる。

`AUTH_GITHUB_ID` が未設定の場合、GitHub OAuthをスキップしてシードデータの最初のユーザーとして自動ログインする（Devモード）。

### その他のコマンド

```bash
pnpm build          # プロダクションビルド
pnpm db:studio      # Drizzle Studio（DB管理UI）
```

## 本番環境 (GitHub OAuth)

GitHub OAuthを使用する場合は `.env.local` に以下を設定する:

```
AUTH_GITHUB_ID=your-github-oauth-app-id
AUTH_GITHUB_SECRET=your-github-oauth-app-secret
AUTH_SECRET=openssl-rand-base64-32-で生成した値
```

## Collector CLI

各メンバーのマシンから `~/.claude/` のデータを収集してダッシュボードに送信するCLI。

```bash
# 初期設定（サーバーURL・APIキーを入力）
pnpm --filter collector dev -- init

# データ同期
pnpm --filter collector dev -- sync
```

APIキーはダッシュボードの Settings ページから発行する。

## Docker

```bash
# イメージのビルド（リポジトリルートから実行）
docker build -t claude-analysis -f apps/dashboard/Dockerfile .

# 実行
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e AUTH_SECRET=... \
  -e AUTH_GITHUB_ID=... \
  -e AUTH_GITHUB_SECRET=... \
  claude-analysis
```
