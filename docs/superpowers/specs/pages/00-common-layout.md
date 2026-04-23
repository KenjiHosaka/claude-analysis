# 共通レイアウト・認証ページ仕様書

## 共通レイアウト

### ルートレイアウト (`app/layout.tsx`)

認証状態に応じてレイアウトを切り替える。

- 未認証: 認証ページ（ログイン画面）を表示
- 認証済み: サイドバー + ヘッダー + メインコンテンツのレイアウトを表示

### サイドバー (`components/sidebar.tsx`)

```
┌─────────────┐
│ [Logo]      │
│ Claude      │
│ Analysis    │
├─────────────┤
│ > Dashboard │  ← アクティブ時はハイライト
│   Members   │
│   Skills    │
│   PRs       │
│   Cost      │
├─────────────┤
│ REPOSITORY  │  ← セクションラベル
│ [v] owner/  │  ← ドロップダウンセレクター
│     repo    │
├─────────────┤
│ [Settings]  │  ← 設定ページリンク
│ [Avatar] ○  │  ← ユーザーアバター + ログアウト
└─────────────┘
```

#### コンポーネント構成

| コンポーネント | 説明 |
|---|---|
| `SidebarLogo` | ロゴとアプリ名 |
| `SidebarNav` | ナビゲーションリンク一覧。現在のパスに応じてアクティブ状態を表示 |
| `RepositorySelector` | リポジトリ選択ドロップダウン。選択状態はURL query paramで管理 |
| `SidebarUserMenu` | ユーザーアバター、名前、ログアウトボタン |

#### ナビゲーション項目

| ラベル | パス | アイコン |
|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard |
| Members | `/members` | Users |
| Skills | `/skills` | Zap |
| PRs | `/prs` | GitPullRequest |
| Cost | `/cost` | DollarSign |

#### リポジトリセレクター

- 全リポジトリ（デフォルト）と個別リポジトリを切り替え可能
- 選択されたリポジトリはURL query param `?repo=owner/name` で管理
- 「全リポジトリ」選択時はquery paramなし
- PRsページ以外でもフィルタとして機能する（セッションのproject名とリポジトリの対応関係で絞り込み）
- リポジトリ一覧はDBの`repositories`テーブルから取得

### ヘッダー (`components/header.tsx`)

```
┌──────────────────────────────────────────────────┐
│  [ページタイトル]           [期間セレクター] [▾]  │
└──────────────────────────────────────────────────┘
```

#### コンポーネント構成

| コンポーネント | 説明 |
|---|---|
| `PageTitle` | 現在のページに応じたタイトルを表示 |
| `DateRangePicker` | 期間セレクター |

#### 期間セレクター (`DateRangePicker`)

- プリセット: 直近7日 / 直近30日 / 直近90日
- カスタム: カレンダーUIで任意の開始日・終了日を選択
- デフォルト: 直近30日
- 選択した期間はURL search params `?from=YYYY-MM-DD&to=YYYY-MM-DD` で管理
- 全ページのデータクエリに期間フィルタとして適用される

### URL State Management

ダッシュボード全体でフィルタ状態をURLで管理する。

```
/dashboard?from=2026-04-01&to=2026-04-23&repo=owner/repo
/members?from=2026-04-01&to=2026-04-23
/members/[userId]?from=2026-04-01&to=2026-04-23
/skills?from=2026-04-01&to=2026-04-23&repo=owner/repo
/prs?repo=owner/repo&from=2026-04-01&to=2026-04-23
/cost?from=2026-04-01&to=2026-04-23&repo=owner/repo
```

| Query Param | 型 | デフォルト | 説明 |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | 30日前 | 期間の開始日 |
| `to` | `YYYY-MM-DD` | 今日 | 期間の終了日 |
| `repo` | `owner/name` | なし（全リポジトリ） | フィルタ対象のリポジトリ |

---

## 認証ページ

### ログインページ (`app/(auth)/login/page.tsx`)

```
┌────────────────────────────┐
│                            │
│      [Logo]                │
│      Claude Analysis       │
│                            │
│  ┌──────────────────────┐  │
│  │ [GitHub] GitHubで     │  │
│  │         ログイン      │  │
│  └──────────────────────┘  │
│                            │
│  チームのClaude Code使用状況│
│  を可視化するダッシュボード  │
│                            │
└────────────────────────────┘
```

#### 動作

1. 「GitHubでログイン」ボタンをクリック
2. GitHub OAuth認証画面にリダイレクト
3. 認証成功後、`/dashboard` にリダイレクト
4. 初回ログイン時は`users`テーブルにレコード作成（github_id, name, avatar_url, emailを保存）
5. 組織外のユーザーがログインした場合の制御は初期スコープでは行わない（Out of Scope参照）

#### Auth.js設定

- Provider: GitHub
- Session strategy: JWT（DB session不要で軽量）
- Callbacks:
  - `signIn`: ユーザー情報をDBにupsert
  - `jwt`: user_idをトークンに含める
  - `session`: セッションオブジェクトにuser_idを追加

---

## 設定ページ (`app/settings/page.tsx`)

### プロフィールセクション

```
┌─────────────────────────────────────┐
│ プロフィール                         │
│                                     │
│ [Avatar]  Kenji Hosaka              │
│           kenji@example.com         │
│           GitHub: @kenjihosaka      │
└─────────────────────────────────────┘
```

### APIキー管理セクション

```
┌─────────────────────────────────────┐
│ APIキー                             │
│                                     │
│ Collector CLIの認証に使用します       │
│                                     │
│ 現在のキー: ca_****...****          │
│ 作成日: 2026-04-20                  │
│                                     │
│ [キーを再生成]  [コピー]             │
└─────────────────────────────────────┘
```

#### 動作

- 初回表示時にAPIキーが未作成の場合は「キーを生成」ボタンを表示
- APIキーは `ca_` プレフィックス + 32文字のランダム文字列
- DBには`api_keys`テーブルでハッシュ化して保存（平文は生成時のみ表示）
- 再生成すると既存キーは無効化される

### リポジトリ管理セクション

```
┌─────────────────────────────────────┐
│ リポジトリ                           │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ owner/repo-a       [削除]    │   │
│ │ owner/repo-b       [削除]    │   │
│ │ owner/repo-c       [削除]    │   │
│ └───────────────────────────────┘   │
│                                     │
│ [+ リポジトリを追加]                  │
└─────────────────────────────────────┘
```

#### 動作

- 「リポジトリを追加」でowner/nameを入力するダイアログを表示
- GitHub APIでリポジトリの存在を検証してから登録
- 削除時は確認ダイアログを表示

### 追加テーブル: `api_keys`

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users |
| key_hash | text | APIキーのSHA-256ハッシュ |
| key_prefix | text | 表示用プレフィックス（`ca_xxxx`） |
| created_at | timestamp | 作成日時 |
| revoked_at | timestamp | 無効化日時（null = 有効） |
