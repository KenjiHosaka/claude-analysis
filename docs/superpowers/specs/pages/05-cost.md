# Cost ページ仕様書

**パス:** `/cost`
**目的:** トークン使用量とコストをモデル別・プロジェクト別・ユーザー別に分析し、リソース最適化に繋げる

---

## ページレイアウト

```
┌─────────────────────────────────────────────────────────┐
│  KPIカード（4列）                                        │
│  [総トークン数] [推定コスト] [Opus比率] [平均セッション]   │
├─────────────────────────────────────────────────────────┤
│  日別コスト推移（積み上げ面グラフ）                        │
│  [モデル別色分け]                                        │
│                                                         │
├──────────────────────────┬──────────────────────────────┤
│  モデル別内訳             │  Input/Output内訳            │
│  （ドーナツチャート）      │  （積み上げ棒グラフ）         │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│  コスト内訳テーブル                                      │
│  [タブ: ユーザー別 | プロジェクト別]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## コンポーネント詳細

### 1. KPIカード (`components/cost/cost-kpi-cards.tsx`)

| カード | 値 | 前期間比 | 説明 |
|---|---|---|---|
| 総トークン数 | input + output + cache の合計 | 前期間比 | 期間内の総トークン消費 |
| 推定コスト | モデル別の単価 × トークン数で算出 | 前期間比 | 概算の利用コスト（USD） |
| Opus比率 | Opusモデルのトークン数 / 全トークン数 × 100 | 前期間比 | 高コストモデルの使用割合 |
| 平均セッションコスト | 推定コスト / セッション数 | 前期間比 | セッション1回あたりのコスト |

#### コスト算出ロジック

モデル別の単価テーブル（設定で管理、将来的にUI上で変更可能）:

| モデル | Input ($/1M tokens) | Output ($/1M tokens) | Cache Read ($/1M tokens) |
|---|---|---|---|
| claude-opus-4-6 | $15.00 | $75.00 | $1.50 |
| claude-sonnet-4-6 | $3.00 | $15.00 | $0.30 |
| claude-haiku-4-5 | $0.80 | $4.00 | $0.08 |

- 単価はアプリケーション設定として`packages/shared`に定数定義
- 将来的に設定ページからUI上で更新可能にすることを想定

#### データ取得クエリ

```sql
SELECT
  tu.model,
  SUM(tu.input_tokens) AS total_input,
  SUM(tu.output_tokens) AS total_output,
  SUM(tu.cache_tokens) AS total_cache
FROM token_usages tu
JOIN sessions s ON s.id = tu.session_id
WHERE s.started_at BETWEEN :from AND :to
GROUP BY tu.model;
```

### 2. 日別コスト推移 (`components/cost/daily-cost-chart.tsx`)

モデル別に色分けした日別のコスト推移を積み上げ面グラフで表示する。

- X軸: 日付
- Y軸: 推定コスト（USD）
- 色分け: モデルごと（Opus=赤系、Sonnet=青系、Haiku=緑系）
- ツールチップ: 日付、モデル別コスト、合計コストを表示
- Rechartsの `AreaChart` + `Area` (stacked) を使用

#### データ取得クエリ

```sql
SELECT
  DATE(s.started_at) AS date,
  tu.model,
  SUM(tu.input_tokens) AS input_tokens,
  SUM(tu.output_tokens) AS output_tokens,
  SUM(tu.cache_tokens) AS cache_tokens
FROM token_usages tu
JOIN sessions s ON s.id = tu.session_id
WHERE s.started_at BETWEEN :from AND :to
GROUP BY DATE(s.started_at), tu.model
ORDER BY date;
```

コスト計算はフロントエンドで単価テーブルを用いて算出する。

### 3. モデル別内訳 (`components/cost/model-breakdown.tsx`)

モデル別のトークン消費量（またはコスト）をドーナツチャートで表示する。

- 各モデルの割合をパーセンテージ表示
- 中央に合計値を表示
- 切り替えトグル: トークン数 / 推定コスト
- ホバーでモデル名、トークン数、コストを表示

### 4. Input/Output内訳 (`components/cost/io-breakdown.tsx`)

モデル別のInput/Output/Cacheトークンの内訳を積み上げ棒グラフで表示する。

- X軸: モデル名
- Y軸: トークン数
- 積み上げ: Input（青）、Output（緑）、Cache Read（黄）
- キャッシュヒット率（cache / input × 100）をバー上にアノテーション表示

### 5. コスト内訳テーブル (`components/cost/cost-table.tsx`)

タブでユーザー別 / プロジェクト別の切り替えが可能な詳細テーブル。

#### ユーザー別タブ

| カラム | 内容 | ソート |
|---|---|---|
| ユーザー | アバター + 名前 | 名前ソート |
| セッション数 | 期間内のセッション数 | 数値ソート |
| Input tokens | input_tokensの合計 | 数値ソート |
| Output tokens | output_tokensの合計 | 数値ソート |
| Cache tokens | cache_tokensの合計 | 数値ソート |
| 推定コスト | モデル別単価での合計コスト | 数値ソート（デフォルト: 降順） |
| チーム内比率 | 個人コスト / チーム全体コスト × 100 | 数値ソート |

#### データ取得クエリ（ユーザー別）

```sql
SELECT
  u.id,
  u.name,
  u.avatar_url,
  COUNT(DISTINCT s.id) AS session_count,
  tu.model,
  SUM(tu.input_tokens) AS input_tokens,
  SUM(tu.output_tokens) AS output_tokens,
  SUM(tu.cache_tokens) AS cache_tokens
FROM users u
JOIN sessions s ON s.user_id = u.id
JOIN token_usages tu ON tu.session_id = s.id
WHERE s.started_at BETWEEN :from AND :to
GROUP BY u.id, u.name, u.avatar_url, tu.model
ORDER BY u.name;
```

#### プロジェクト別タブ

| カラム | 内容 | ソート |
|---|---|---|
| プロジェクト | プロジェクト名（作業ディレクトリ） | 名前ソート |
| セッション数 | 期間内のセッション数 | 数値ソート |
| Input tokens | input_tokensの合計 | 数値ソート |
| Output tokens | output_tokensの合計 | 数値ソート |
| Cache tokens | cache_tokensの合計 | 数値ソート |
| 推定コスト | モデル別単価での合計コスト | 数値ソート（デフォルト: 降順） |

#### データ取得クエリ（プロジェクト別）

```sql
SELECT
  s.project,
  COUNT(DISTINCT s.id) AS session_count,
  tu.model,
  SUM(tu.input_tokens) AS input_tokens,
  SUM(tu.output_tokens) AS output_tokens,
  SUM(tu.cache_tokens) AS cache_tokens
FROM sessions s
JOIN token_usages tu ON tu.session_id = s.id
WHERE s.started_at BETWEEN :from AND :to
GROUP BY s.project, tu.model
ORDER BY s.project;
```

コスト計算はフロントエンドで行う（モデルごとの行を集約し、単価テーブルで算出）。

---

## Server Component / Client Component 分割

| コンポーネント | 種別 | 理由 |
|---|---|---|
| `CostPage` | Server | データ取得 |
| `CostKpiCards` | Server | 静的表示 |
| `DailyCostChart` | Client | Recharts |
| `ModelBreakdown` | Client | Recharts + トグル |
| `IoBreakdown` | Client | Recharts |
| `CostTable` | Client | タブ切り替え + ソート |

---

## ローディング・エラー状態

| 状態 | 表示 |
|---|---|
| ローディング | 各カード・チャートにスケルトンUI |
| データなし | 「選択期間にトークン使用データがありません」 |
| エラー | 「データの取得に失敗しました」+ リトライボタン |
