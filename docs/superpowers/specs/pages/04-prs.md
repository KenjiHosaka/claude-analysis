# PRs ページ仕様書

**パス:** `/prs`
**目的:** PR単位でClaude Codeのスキル使用状況を追跡し、スキルがどのように開発に貢献しているかを把握する

---

## ページレイアウト

```
┌─────────────────────────────────────────────────────────┐
│  KPIカード（3列）                                        │
│  [PR総数] [スキル使用PR率] [PR平均スキル数]               │
├─────────────────────────────────────────────────────────┤
│  [検索: PR番号/タイトル]  [ステータス: ▾ All]             │
├─────────────────────────────────────────────────────────┤
│  PR一覧テーブル                                          │
│ ┌────┬────────────────┬───────┬──────┬───────┬────────┐ │
│ │ #  │ タイトル        │ 作者  │スキル│トークン│ 日時   │ │
│ ├────┼────────────────┼───────┼──────┼───────┼────────┤ │
│ │ 42 │ Add auth flow  │ userA │  3  │ 45K  │ 04/20  │ │
│ │ 41 │ Fix bug #123   │ userB │  2  │ 22K  │ 04/19  │ │
│ │ 40 │ Refactor API   │ userC │  5  │ 89K  │ 04/18  │ │
│ └────┴────────────────┴───────┴──────┴───────┴────────┘ │
│                                                         │
│  [< 1 2 3 >]                                            │
├─────────────────────────────────────────────────────────┤
│  PR詳細（展開時）                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  #42 Add auth flow                                │  │
│  │  作者: User A  ブランチ: feature/auth              │  │
│  │  作成日: 2026-04-20  マージ日: 2026-04-21          │  │
│  │                                                   │  │
│  │  使用スキル: [brainstorming] [tdd] [debugging]     │  │
│  │                                                   │  │
│  │  関連セッション（3件）                              │  │
│  │  ┌──────────┬─────────┬────────┬──────┬────────┐  │  │
│  │  │ 開始日時  │ 時間    │トークン │スキル │ Agent  │  │  │
│  │  ├──────────┼─────────┼────────┼──────┼────────┤  │  │
│  │  │ 04/20 10:│ 45min   │ 22K   │  2   │  1     │  │  │
│  │  │ 04/20 14:│ 30min   │ 15K   │  1   │  0     │  │  │
│  │  │ 04/21 09:│ 20min   │  8K   │  1   │  2     │  │  │
│  │  └──────────┴─────────┴────────┴──────┴────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## リポジトリ選択との連動

- サイドバーのリポジトリセレクターで選択されたリポジトリのPRのみ表示
- 「全リポジトリ」選択時は全リポジトリのPRを横断表示
- リポジトリ未選択（初回アクセス）時はリポジトリが1つしかなければそれを、複数あれば「全リポジトリ」を表示

---

## コンポーネント詳細

### 1. KPIカード (`components/prs/pr-kpi-cards.tsx`)

| カード | 値 | 説明 |
|---|---|---|
| PR総数 | 期間内のPR数（選択リポジトリ内） | 開発活動量 |
| スキル使用PR率 | 1つ以上のスキルが使用されたPR / 全PR × 100 | スキルの開発プロセスへの浸透度 |
| PR平均スキル数 | 期間内PRで使用されたスキルの延べ数 / PR数 | PR1件あたりのスキル活用度 |

#### データ取得クエリ

```sql
-- PR総数
SELECT COUNT(*) FROM pull_requests pr
JOIN repositories r ON r.id = pr.repository_id
WHERE pr.created_at BETWEEN :from AND :to
  AND (:repo IS NULL OR (r.owner || '/' || r.name) = :repo);

-- スキル使用PR率
SELECT
  COUNT(DISTINCT pr.id) FILTER (WHERE su.id IS NOT NULL) AS prs_with_skills,
  COUNT(DISTINCT pr.id) AS total_prs
FROM pull_requests pr
JOIN repositories r ON r.id = pr.repository_id
LEFT JOIN pr_sessions ps ON ps.pull_request_id = pr.id
LEFT JOIN skill_usages su ON su.session_id = ps.session_id
WHERE pr.created_at BETWEEN :from AND :to
  AND (:repo IS NULL OR (r.owner || '/' || r.name) = :repo);
```

### 2. フィルタバー (`components/prs/pr-filters.tsx`)

| フィルタ | 種類 | オプション |
|---|---|---|
| 検索 | テキスト入力 | PR番号（#付きまたは数字のみ）またはタイトル部分一致 |
| ステータス | ドロップダウン | All / Open / Merged / Closed |

- 検索はデバウンス300ms
- フィルタ状態はURL search paramsで管理: `?status=merged&q=auth`

### 3. PR一覧テーブル (`components/prs/pr-table.tsx`)

#### テーブルカラム

| カラム | 内容 | ソート |
|---|---|---|
| # | PR番号 | 数値ソート |
| タイトル | PRタイトル（リポジトリ名プレフィックス付き ※全リポジトリ表示時） | - |
| 作者 | 作者名 + アバター | 名前ソート |
| スキル数 | PRに紐づくセッションで使用されたユニークスキル数 | 数値ソート |
| トークン | PRに紐づくセッションのトークン合計 | 数値ソート |
| 日時 | PRの作成日 | 日時ソート（デフォルト: 降順） |

- 行クリックで詳細をテーブル下に展開（アコーディオン方式）
- 1ページ20件、ページネーション付き

#### データ取得クエリ

```sql
SELECT
  pr.id,
  pr.pr_number,
  pr.title,
  pr.author,
  pr.branch,
  pr.created_at,
  pr.merged_at,
  r.owner,
  r.name AS repo_name,
  COUNT(DISTINCT su.skill_name) AS skill_count,
  COALESCE(SUM(tu.input_tokens + tu.output_tokens), 0) AS total_tokens
FROM pull_requests pr
JOIN repositories r ON r.id = pr.repository_id
LEFT JOIN pr_sessions ps ON ps.pull_request_id = pr.id
LEFT JOIN sessions s ON s.id = ps.session_id
LEFT JOIN skill_usages su ON su.session_id = s.id
LEFT JOIN token_usages tu ON tu.session_id = s.id
WHERE pr.created_at BETWEEN :from AND :to
  AND (:repo IS NULL OR (r.owner || '/' || r.name) = :repo)
  AND (:status IS NULL OR
    CASE
      WHEN :status = 'merged' THEN pr.merged_at IS NOT NULL
      WHEN :status = 'open' THEN pr.merged_at IS NULL AND pr.closed_at IS NULL
      WHEN :status = 'closed' THEN pr.closed_at IS NOT NULL AND pr.merged_at IS NULL
      ELSE true
    END)
  AND (:q IS NULL OR pr.title ILIKE '%' || :q || '%' OR pr.pr_number::text = :q)
GROUP BY pr.id, r.owner, r.name
ORDER BY pr.created_at DESC
LIMIT :limit OFFSET :offset;
```

### 4. PR詳細展開 (`components/prs/pr-detail.tsx`)

テーブルの行をクリックすると展開される詳細セクション。

#### 表示内容

**PR情報ヘッダー:**
- PR番号、タイトル
- 作者、ブランチ名
- 作成日、マージ日（未マージの場合は「未マージ」）
- GitHubへのリンク（外部リンクアイコン）

**使用スキル一覧:**
- PRに紐づく全セッションで使用されたスキルをバッジ表示
- 配布スキルは青バッジ、その他はグレーバッジ
- 各バッジに使用回数をツールチップ表示

**関連セッション一覧:**

| カラム | 内容 |
|---|---|
| 開始日時 | セッションの開始時刻 |
| 時間 | セッション時間 |
| トークン | セッション内のトークン消費量 |
| スキル | セッション内で使用したスキル数 |
| サブエージェント | セッション内で使用したサブエージェント数 |

#### データ取得（展開時にfetch）

```sql
-- PR詳細の関連セッション
SELECT
  s.id,
  s.started_at,
  s.ended_at,
  COALESCE(SUM(tu.input_tokens + tu.output_tokens), 0) AS total_tokens,
  COUNT(DISTINCT su.id) AS skill_count,
  COUNT(DISTINCT sau.id) AS subagent_count
FROM pr_sessions ps
JOIN sessions s ON s.id = ps.session_id
LEFT JOIN token_usages tu ON tu.session_id = s.id
LEFT JOIN skill_usages su ON su.session_id = s.id
LEFT JOIN subagent_usages sau ON sau.session_id = s.id
WHERE ps.pull_request_id = :prId
GROUP BY s.id
ORDER BY s.started_at;

-- PRで使用されたスキル一覧
SELECT
  su.skill_name,
  COUNT(*) AS usage_count,
  CASE WHEN ds.id IS NOT NULL THEN true ELSE false END AS is_distributed
FROM pr_sessions ps
JOIN skill_usages su ON su.session_id = ps.session_id
LEFT JOIN distributed_skills ds ON ds.skill_name = su.skill_name
WHERE ps.pull_request_id = :prId
GROUP BY su.skill_name, ds.id
ORDER BY usage_count DESC;
```

---

## PR-Session紐付けロジック

Collector CLIからデータ受信時に、サーバー側で以下のロジックで紐付けを実行する:

1. セッションのbranchフィールドを取得
2. `pull_requests`テーブルでbranchが一致するPRを検索
3. 一致するPRが見つかればpr_sessionsにレコードを作成
4. PR情報がまだDBにない場合は、GitHub APIからPR情報を取得して保存

この紐付けはデータ受信の非同期ジョブとして実行する。

---

## pull_requestsテーブルへの補足カラム

設計仕様書のテーブルに`closed_at`カラムが必要:

| カラム | 型 | 説明 |
|---|---|---|
| closed_at | timestamp | PRがクローズされた日時（null = open） |

---

## Server Component / Client Component 分割

| コンポーネント | 種別 | 理由 |
|---|---|---|
| `PrsPage` | Server | 初期データ取得 |
| `PrKpiCards` | Server | 静的表示 |
| `PrFilters` | Client | フィルタのインタラクション |
| `PrTable` | Client | ソート、展開のインタラクション |
| `PrDetail` | Client | 展開時の動的データ取得 |

---

## ローディング・エラー状態

| 状態 | 表示 |
|---|---|
| ローディング | テーブル: 行スケルトン |
| PR展開ローディング | 展開エリアにスピナー表示 |
| リポジトリ未登録 | 「リポジトリが登録されていません。設定ページから追加してください。」 |
| データなし | 「選択条件に一致するPRがありません」 |
| エラー | 「データの取得に失敗しました」+ リトライボタン |
