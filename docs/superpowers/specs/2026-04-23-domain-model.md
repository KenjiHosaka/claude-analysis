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

## Page Aggregate Models

各ページが必要とする集約（Aggregate）を定義する。集約はページのコンポーネントが消費するデータの形状を表し、どのエンティティをどのように結合・集計するかを明示する。

全集約に共通のフィルタコンテキスト:

```typescript
type FilterContext = {
  from: Date;       // 期間開始
  to: Date;         // 期間終了
  repo?: string;    // リポジトリ絞り込み（"owner/name"）
};
```

---

### Dashboard ページの集約

#### TeamKpiAggregate

チーム全体のKPI指標を集約する。Session を起点に、TokenUsage・SkillUsage・DistributedSkill を横断集計する。

```
集約ルート: なし（チーム全体の統計）
構成エンティティ: Session, TokenUsage, SkillUsage, DistributedSkill
```

```typescript
type TeamKpiAggregate = {
  sessionCount: number;                     // COUNT(Session)
  totalTokens: number;                      // SUM(TokenUsage.input + output)
  skillInvocationCount: number;             // COUNT(SkillUsage)
  distributedSkillAdoptionRate: number;     // COUNT(DISTINCT used distributed skills) / COUNT(DistributedSkill)
  previousPeriod: {                         // 前期間の同指標（前期間比計算用）
    sessionCount: number;
    totalTokens: number;
    skillInvocationCount: number;
    distributedSkillAdoptionRate: number;
  };
};
```

#### DailyActivityAggregate

日別のアクティビティ推移。Session を日付でグループ化し、TokenUsage を結合。

```
集約ルート: 日付（DATE(Session.started_at)）
構成エンティティ: Session, TokenUsage
```

```typescript
type DailyActivityAggregate = {
  date: string;           // YYYY-MM-DD
  sessionCount: number;   // COUNT(DISTINCT Session)
  totalTokens: number;    // SUM(TokenUsage.input + output)
}[];
```

#### SkillRankingAggregate

スキル使用頻度のランキング。SkillUsage を skill_name でグループ化し、DistributedSkill と LEFT JOIN して配布スキルかどうかを判定。

```
集約ルート: SkillUsage.skill_name
構成エンティティ: SkillUsage, Session, DistributedSkill
```

```typescript
type SkillRankingAggregate = {
  skillName: string;
  usageCount: number;        // COUNT(SkillUsage)
  userCount: number;         // COUNT(DISTINCT Session.user_id)
  isDistributed: boolean;    // DistributedSkill に存在するか
}[];
```

#### MemberSkillRateAggregate

メンバーごとの配布スキル活用率。User を起点に、Session → SkillUsage → DistributedSkill を結合して集計。

```
集約ルート: User
構成エンティティ: User, Session, SkillUsage, DistributedSkill
```

```typescript
type MemberSkillRateAggregate = {
  userId: string;
  userName: string;
  avatarUrl: string;
  usedDistributedSkillCount: number;    // COUNT(DISTINCT SkillUsage.skill_name WHERE in DistributedSkill)
  totalDistributedSkillCount: number;   // COUNT(DistributedSkill)
}[];
```

---

### Members ページの集約

#### MemberListAggregate

メンバー一覧。User を起点に、Session・TokenUsage・SkillUsage・DistributedSkill を結合して集計。

```
集約ルート: User
構成エンティティ: User, Session, TokenUsage, SkillUsage, DistributedSkill
```

```typescript
type MemberListAggregate = {
  userId: string;
  userName: string;
  avatarUrl: string;
  sessionCount: number;
  totalTokens: number;
  distributedSkillAdoptionRate: number;    // usedDistributed / totalDistributed
  lastActivityAt: Date | null;             // MAX(Session.started_at)
};
```

#### MemberDetailAggregate

個人の詳細情報。特定 User のセッションとその関連データを包括的に集約。

```
集約ルート: User（単一）
構成エンティティ: User, Session, TokenUsage, SkillUsage, SubagentUsage, DistributedSkill
```

```typescript
type MemberDetailAggregate = {
  user: {
    id: string;
    name: string;
    avatarUrl: string;
    email: string;
  };
  kpi: {
    sessionCount: number;
    totalTokens: number;
    subagentInvocationCount: number;     // COUNT(SubagentUsage)
    distributedSkillAdoptionRate: number;
    previousPeriod: { /* 同構造 */ };
  };
  dailyTrend: {                          // Session を日付グループ化
    date: string;
    sessionCount: number;
    totalTokens: number;
    skillCount: number;                  // COUNT(SkillUsage)
  }[];
  skillRanking: {                        // SkillUsage を skill_name グループ化
    skillName: string;
    usageCount: number;
    isDistributed: boolean;
  }[];
  projectBreakdown: {                    // Session を project グループ化
    project: string;
    sessionCount: number;
  }[];
  subagentBreakdown: {                   // SubagentUsage を日付 + agent_type グループ化
    date: string;
    agentType: string;
    invocationCount: number;
  }[];
  recentSessions: {                      // Session + 関連データの非正規化
    sessionId: string;
    startedAt: Date;
    endedAt: Date | null;
    project: string;
    branch: string | null;
    totalTokens: number;
    skills: string[];                    // ARRAY_AGG(DISTINCT SkillUsage.skill_name)
    subagentTypes: string[];             // ARRAY_AGG(DISTINCT SubagentUsage.agent_type)
    linkedPrNumber: number | null;       // PrSession 経由で紐づくPR番号
  }[];
};
```

---

### Skills ページの集約

#### SkillKpiAggregate

スキル全体のKPI。DistributedSkill と SkillUsage の突合せ。

```
集約ルート: なし（全体統計）
構成エンティティ: DistributedSkill, SkillUsage, Session
```

```typescript
type SkillKpiAggregate = {
  distributedSkillCount: number;          // COUNT(DistributedSkill)
  adoptionRate: number;                   // 期間内に1回以上使用された配布スキル / 全配布スキル
  unusedSkillCount: number;               // 期間内に未使用の配布スキル数
};
```

#### SkillHeatmapAggregate

スキル x メンバーの使用頻度マトリクス。DistributedSkill と User の直積に SkillUsage を LEFT JOIN。

```
集約ルート: (DistributedSkill.skill_name, User)
構成エンティティ: DistributedSkill, User, Session, SkillUsage
```

```typescript
type SkillHeatmapAggregate = {
  skills: string[];                       // DistributedSkill 全件の skill_name
  members: {
    userId: string;
    userName: string;
    avatarUrl: string;
  }[];
  matrix: {                               // skills x members のセル
    skillName: string;
    userId: string;
    usageCount: number;                   // COUNT(SkillUsage)（0含む）
  }[];
};
```

#### UnusedSkillAggregate

未活用スキル一覧。DistributedSkill のうち、期間内に SkillUsage が存在しないものを抽出。

```
集約ルート: DistributedSkill（未使用のもの）
構成エンティティ: DistributedSkill, SkillUsage, Session
```

```typescript
type UnusedSkillAggregate = {
  skillName: string;
  description: string | null;
  registeredAt: Date;
}[];
```

#### SkillTrendAggregate

スキル別の日次使用推移。SkillUsage を日付 + skill_name でグループ化。

```
集約ルート: (DATE(SkillUsage.invoked_at), SkillUsage.skill_name)
構成エンティティ: SkillUsage, Session, DistributedSkill
```

```typescript
type SkillTrendAggregate = {
  date: string;
  skillName: string;
  usageCount: number;
}[];
```

---

### PRs ページの集約

#### PrKpiAggregate

PR全体のKPI。PullRequest を起点に、PrSession → SkillUsage を結合。

```
集約ルート: なし（リポジトリ内全体統計）
構成エンティティ: PullRequest, Repository, PrSession, Session, SkillUsage
```

```typescript
type PrKpiAggregate = {
  totalPrCount: number;                    // COUNT(PullRequest)
  prsWithSkillsRate: number;               // スキル使用PRの割合
  avgSkillsPerPr: number;                  // PRあたりの平均スキル使用数
};
```

#### PrListAggregate

PR一覧。PullRequest を起点に、PrSession → Session → TokenUsage・SkillUsage を結合。

```
集約ルート: PullRequest
構成エンティティ: PullRequest, Repository, PrSession, Session, TokenUsage, SkillUsage
```

```typescript
type PrListAggregate = {
  prId: string;
  prNumber: number;
  title: string;
  author: string;
  branch: string;
  repoOwner: string;
  repoName: string;
  createdAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
  uniqueSkillCount: number;               // COUNT(DISTINCT SkillUsage.skill_name)
  totalTokens: number;                    // SUM(TokenUsage.input + output)
};
```

#### PrDetailAggregate

PR詳細。特定 PullRequest に紐づくセッション群とスキル使用を展開。

```
集約ルート: PullRequest（単一）
構成エンティティ: PullRequest, PrSession, Session, TokenUsage, SkillUsage, SubagentUsage, DistributedSkill
```

```typescript
type PrDetailAggregate = {
  pr: {
    prNumber: number;
    title: string;
    author: string;
    branch: string;
    repoOwner: string;
    repoName: string;
    createdAt: Date;
    mergedAt: Date | null;
  };
  skills: {                              // PRに紐づく全セッションのスキル集約
    skillName: string;
    usageCount: number;
    isDistributed: boolean;
  }[];
  sessions: {                            // PrSession 経由の関連セッション
    sessionId: string;
    startedAt: Date;
    endedAt: Date | null;
    totalTokens: number;
    skillCount: number;
    subagentCount: number;
  }[];
};
```

---

### Cost ページの集約

#### CostKpiAggregate

コスト全体のKPI。TokenUsage を起点に全量集計 + モデル別内訳。

```
集約ルート: なし（全体統計）
構成エンティティ: TokenUsage, Session
```

```typescript
type CostKpiAggregate = {
  totalTokens: number;                    // input + output + cache
  estimatedCostUsd: number;               // モデル別単価 × トークン数
  opusRatio: number;                      // Opusトークン / 全トークン
  avgSessionCostUsd: number;              // estimatedCost / sessionCount
  previousPeriod: { /* 同構造 */ };
};
```

#### DailyCostAggregate

日別のモデル別コスト推移。TokenUsage を日付 + model でグループ化。

```
集約ルート: (DATE(Session.started_at), TokenUsage.model)
構成エンティティ: TokenUsage, Session
```

```typescript
type DailyCostAggregate = {
  date: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
}[];
// コスト算出はフロントエンド側で単価テーブルを適用
```

#### ModelBreakdownAggregate

モデル別のトークン消費内訳。TokenUsage を model でグループ化。

```
集約ルート: TokenUsage.model
構成エンティティ: TokenUsage, Session
```

```typescript
type ModelBreakdownAggregate = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;                    // input + output + cache
  estimatedCostUsd: number;
}[];
```

#### CostByUserAggregate

ユーザー別のコスト内訳。User → Session → TokenUsage を model 込みで集計。

```
集約ルート: (User, TokenUsage.model)
構成エンティティ: User, Session, TokenUsage
```

```typescript
type CostByUserAggregate = {
  userId: string;
  userName: string;
  avatarUrl: string;
  sessionCount: number;
  models: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  }[];
}[];
// チーム内比率・推定コストはフロントエンド側で算出
```

#### CostByProjectAggregate

プロジェクト別のコスト内訳。Session.project → TokenUsage を model 込みで集計。

```
集約ルート: (Session.project, TokenUsage.model)
構成エンティティ: Session, TokenUsage
```

```typescript
type CostByProjectAggregate = {
  project: string;
  sessionCount: number;
  models: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  }[];
}[];
```

---

## Aggregate → Page Component Mapping

各集約がどのページのどのコンポーネントで消費されるかの対応表。

| 集約 | ページ | コンポーネント |
|------|--------|---------------|
| TeamKpiAggregate | Dashboard | KpiCards |
| DailyActivityAggregate | Dashboard | DailyActivityChart |
| SkillRankingAggregate | Dashboard | SkillRanking |
| MemberSkillRateAggregate | Dashboard | MemberSkillChart |
| MemberListAggregate | Members | MembersListPage |
| MemberDetailAggregate | Members | MemberDetailPage (全サブコンポーネント) |
| SkillKpiAggregate | Skills | SkillKpiCards |
| SkillHeatmapAggregate | Skills | SkillHeatmap |
| UnusedSkillAggregate | Skills | UnusedSkills |
| SkillTrendAggregate | Skills | SkillTrendChart |
| PrKpiAggregate | PRs | PrKpiCards |
| PrListAggregate | PRs | PrTable |
| PrDetailAggregate | PRs | PrDetail |
| CostKpiAggregate | Cost | CostKpiCards |
| DailyCostAggregate | Cost | DailyCostChart |
| ModelBreakdownAggregate | Cost | ModelBreakdown, IoBreakdown |
| CostByUserAggregate | Cost | CostTable（ユーザー別タブ） |
| CostByProjectAggregate | Cost | CostTable（プロジェクト別タブ） |
