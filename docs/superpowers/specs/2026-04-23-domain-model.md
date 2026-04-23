# Domain Model & Data Model

## Domain Model Overview

Claude Code Usage Dashboard は以下のドメイン概念で構成される。

```
User ─────────┬──── Session ────┬──── TokenUsage
              │                 ├──── SkillUsage
              │                 └──── SubagentUsage
              │
              └──── Repository ──── PullRequest ──── PR-Session (link)
```

## Domain Entities

### User（ユーザー）

チームメンバーを表す。GitHub OAuthで認証・識別される。

- 一人のユーザーは複数のセッションを持つ
- 一人のユーザーは複数のリポジトリにアクセスできる
- ダッシュボード上では「チーム全体ビュー」と「個人詳細ビュー」の両方の主体となる

### Session（セッション）

Claude Codeの1回の作業単位。ユーザーが `claude` コマンドを起動してから終了するまでの一連の操作を表す。

- 1セッションは1ユーザーに属する
- 1セッションは1つのプロジェクト（作業ディレクトリ）に紐づく
- 1セッションは0〜1つのブランチに紐づく（ブランチ外の作業もあり得る）
- セッション内で複数のスキル、サブエージェント、トークン消費が発生する

### TokenUsage（トークン使用量）

セッション内でのLLMトークン消費を記録する。モデル別に集計される。

- 1レコードは1セッション・1モデルに対応する
- input_tokens, output_tokens, cache_tokens を持つ
- コスト分析やモデル別利用傾向の把握に使用される

### SkillUsage（スキル使用）

セッション内でのスキル呼び出しを記録する。

- 1セッション内で同じスキルが複数回呼ばれる場合、それぞれ個別のレコードとなる
- 配布スキルの活用度を測定する主要データ
- スキル名 + 呼び出し時刻で記録する

### SubagentUsage（サブエージェント使用）

セッション内でのサブエージェント呼び出しを記録する。

- エージェントタイプ（Explore, Plan, code-reviewer 等）ごとに集計
- ツール呼び出し回数、消費トークン数を持つ

### Repository（リポジトリ）

管理対象のGitHubリポジトリ。

- owner/name で一意に識別される
- ダッシュボードでリポジトリを切り替えてPRを閲覧できる
- 1リポジトリは複数のPRを持つ

### PullRequest（プルリクエスト）

GitHubのプルリクエスト。

- 1つのリポジトリに属する
- ブランチ名を持ち、これがセッションとの紐付けキーとなる
- PR番号、タイトル、作者の情報を持つ

### DistributedSkill（配布スキル）

チームに配布しているスキルの登録簿。

- ダッシュボードのスキル管理画面で登録・編集する
- skill_usagesとskill_nameで照合し、活用率を算出する
- 未登録のスキルが使用された場合は「その他」として集計される

### PR-Session（PR-セッション紐付け）

PullRequestとSessionの多対多の関連を表す。

- PRのブランチ名とセッションの作業ブランチを照合して関連付ける
- 1つのPRに複数のセッションが関連する（複数回に分けて作業することが一般的）
- 1つのセッションが複数のPRに関連することもあり得る（ブランチ運用次第）

## Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  User    │1    * │  Session     │1    * │  TokenUsage  │
│──────────│───────│──────────────│───────│──────────────│
│ id (PK)  │       │ id (PK)      │       │ id (PK)      │
│ github_id│       │ user_id (FK) │       │ session_id   │
│ name     │       │ project      │       │ model        │
│ avatar   │       │ branch       │       │ input_tokens │
│ email    │       │ started_at   │       │ output_tokens│
│ role     │       │ ended_at     │       │ cache_tokens │
└──────────┘       │ session_kind │       └──────────────┘
                   └──────┬───────┘
                          │1    *
                   ┌──────┴───────┐       ┌──────────────────┐
                   │              │       │  SubagentUsage   │
                   │         1    * ──────│──────────────────│
                   │              │       │ id (PK)          │
                   │         1    *       │ session_id (FK)  │
                   │              │       │ agent_type       │
                   │  ┌───────────┘       │ tool_calls_count │
                   │  │                   │ tokens_used      │
                   │  │                   └──────────────────┘
            ┌──────┴──┴─────┐
            │  SkillUsage   │
            │───────────────│
            │ id (PK)       │
            │ session_id    │
            │ skill_name    │
            │ invoked_at    │
            └───────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Repository   │1    * │ PullRequest  │ *   * │  Session     │
│──────────────│───────│──────────────│───────│  (上記)      │
│ id (PK)      │       │ id (PK)      │       │              │
│ owner        │       │ repo_id (FK) │       └──────────────┘
│ name         │       │ pr_number    │              ↑
│ url          │       │ branch       │       ┌──────┴───────┐
└──────────────┘       │ title        │       │ PrSession    │
                       │ author       │       │──────────────│
                       │ created_at   │       │ pr_id (FK)   │
                       │ merged_at    │       │ session_id   │
                       └──────────────┘       └──────────────┘

```

## Relationships Summary

| 関連 | カーディナリティ | 紐付けキー |
|------|-----------------|-----------|
| User → Session | 1 : N | user_id |
| Session → TokenUsage | 1 : N | session_id |
| Session → SkillUsage | 1 : N | session_id |
| Session → SubagentUsage | 1 : N | session_id |
| Repository → PullRequest | 1 : N | repo_id |
| PullRequest ↔ Session | M : N | PrSession (branch名で照合) |

## Aggregation Patterns

ダッシュボードの各ビューで必要となる主要な集計パターン:

### チーム全体サマリー
- User → Sessions → TokenUsage を集計し、メンバー別トークン消費量
- User → Sessions → SkillUsage を集計し、メンバー別スキル活用率
- User → Sessions → SubagentUsage を集計し、メンバー別サブエージェント使用量

### メンバー詳細
- 特定User → Sessions を時系列で集計し、使用推移
- 特定User → Sessions → SkillUsage でよく使うスキルをランキング
- 特定User → Sessions を project でグループ化し、プロジェクト別傾向

### スキル活用分析
- SkillUsage を skill_name でグループ化し、スキルごとの利用回数
- SkillUsage → Session → User で、スキルごとの利用者分布
- DistributedSkill と実使用の差分で「未活用スキル」を検出

### PR連携ビュー
- Repository でフィルタ → PullRequest → PrSession → Session → SkillUsage
- PR単位で使用されたスキル一覧を表示

### コスト/トークン分析
- TokenUsage を model でグループ化し、モデル別消費量
- TokenUsage → Session → User/project でユーザー別・プロジェクト別消費量
