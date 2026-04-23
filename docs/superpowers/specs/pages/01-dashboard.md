# Dashboard ページ仕様書

**パス:** `/dashboard`
**目的:** チーム全体のClaude Code活用状況をサマリーで把握する

---

## ページレイアウト

```
┌─────────────────────────────────────────────────────────┐
│  KPIカード（4列）                                        │
│  [セッション数] [トークン消費量] [スキル呼出数] [活用率]   │
├──────────────────────────┬──────────────────────────────┤
│  日別アクティビティ       │  スキル使用ランキング         │
│  チャート（折れ線）       │  Top10（横棒グラフ）          │
│                          │                              │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│  メンバー別スキル活用率（横棒グラフ）                      │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## コンポーネント詳細

### 1. KPIカード (`components/dashboard/kpi-cards.tsx`)

4つのメトリクスを横並びで表示する。

| カード | 値 | 前期間比 | 説明 |
|---|---|---|---|
| セッション数 | 期間内の総セッション数 | +12% ↑ / -5% ↓ | アクティブなClaude Code利用量 |
| トークン消費量 | 期間内の総トークン数（input + output） | 前期間比 | LLMリソースの消費量 |
| スキル呼び出し数 | 期間内のスキル使用回数 | 前期間比 | スキルの総活用回数 |
| 配布スキル活用率 | 使用された配布スキル数 / 登録済み配布スキル数 × 100 | 前期間比 | 配布スキルがどの程度浸透しているか |

#### 前期間比の計算

- 選択期間と同じ日数の直前期間と比較する
- 例: 直近30日が選択されている場合、その前の30日間と比較
- 増加は緑色 ↑、減少は赤色 ↓、変化なしはグレーで表示

#### データ取得クエリ

```sql
-- セッション数
SELECT COUNT(*) FROM sessions
WHERE started_at BETWEEN :from AND :to;

-- トークン消費量
SELECT SUM(input_tokens + output_tokens) FROM token_usages tu
JOIN sessions s ON s.id = tu.session_id
WHERE s.started_at BETWEEN :from AND :to;

-- スキル呼び出し数
SELECT COUNT(*) FROM skill_usages su
JOIN sessions s ON s.id = su.session_id
WHERE s.started_at BETWEEN :from AND :to;

-- 配布スキル活用率
SELECT COUNT(DISTINCT su.skill_name) FROM skill_usages su
JOIN sessions s ON s.id = su.session_id
JOIN distributed_skills ds ON ds.skill_name = su.skill_name
WHERE s.started_at BETWEEN :from AND :to;
```

---

### 2. 日別アクティビティチャート (`components/dashboard/daily-activity-chart.tsx`)

期間内の日別アクティビティを折れ線グラフで表示する。

#### 表示系列

| 系列 | 色 | 説明 |
|---|---|---|
| セッション数 | 青 | 日別のセッション開始数 |
| トークン使用量 | 紫 | 日別のトークン消費量（千トークン単位） |

- X軸: 日付
- Y軸（左）: セッション数
- Y軸（右）: トークン使用量（千トークン単位）
- ツールチップ: 日付、セッション数、トークン数を表示
- Rechartsの `ComposedChart` + `Line` を使用

#### データ取得クエリ

```sql
SELECT
  DATE(s.started_at) AS date,
  COUNT(DISTINCT s.id) AS session_count,
  COALESCE(SUM(tu.input_tokens + tu.output_tokens), 0) AS total_tokens
FROM sessions s
LEFT JOIN token_usages tu ON tu.session_id = s.id
WHERE s.started_at BETWEEN :from AND :to
GROUP BY DATE(s.started_at)
ORDER BY date;
```

---

### 3. スキル使用ランキング (`components/dashboard/skill-ranking.tsx`)

期間内に最も使用されたスキルのTop10を横棒グラフで表示する。

#### 表示内容

- Y軸: スキル名
- X軸: 使用回数
- 配布スキルは青色、未登録スキルはグレーで色分け
- 各バーにホバーすると使用回数と使用ユーザー数をツールチップで表示

#### データ取得クエリ

```sql
SELECT
  su.skill_name,
  COUNT(*) AS usage_count,
  COUNT(DISTINCT s.user_id) AS user_count,
  CASE WHEN ds.id IS NOT NULL THEN true ELSE false END AS is_distributed
FROM skill_usages su
JOIN sessions s ON s.id = su.session_id
LEFT JOIN distributed_skills ds ON ds.skill_name = su.skill_name
WHERE s.started_at BETWEEN :from AND :to
GROUP BY su.skill_name, ds.id
ORDER BY usage_count DESC
LIMIT 10;
```

---

### 4. メンバー別スキル活用率 (`components/dashboard/member-skill-chart.tsx`)

各メンバーが配布スキルのうちどれだけを使用しているかを横棒グラフで表示する。

#### 表示内容

- Y軸: メンバー名（アバター付き）
- X軸: 活用率（0〜100%）
- バーの色: 活用率に応じたグラデーション（低=赤、中=黄、高=緑）
- バー上に具体的な数値を表示（例: "8/12スキル使用"）

#### 計算ロジック

```
活用率 = メンバーが期間内に使用した配布スキルのユニーク数 / 登録済み配布スキル総数 × 100
```

#### データ取得クエリ

```sql
SELECT
  u.id,
  u.name,
  u.avatar_url,
  COUNT(DISTINCT su.skill_name) AS used_skill_count,
  (SELECT COUNT(*) FROM distributed_skills) AS total_distributed
FROM users u
LEFT JOIN sessions s ON s.user_id = u.id AND s.started_at BETWEEN :from AND :to
LEFT JOIN skill_usages su ON su.session_id = s.id
LEFT JOIN distributed_skills ds ON ds.skill_name = su.skill_name
GROUP BY u.id, u.name, u.avatar_url
ORDER BY used_skill_count DESC;
```

---

## Server Component / Client Component 分割

| コンポーネント | 種別 | 理由 |
|---|---|---|
| `DashboardPage` | Server | データ取得をサーバー側で実行 |
| `KpiCards` | Server | 静的な数値表示のみ |
| `DailyActivityChart` | Client | Rechartsはクライアント側でレンダリング |
| `SkillRanking` | Client | Rechartsはクライアント側でレンダリング |
| `MemberSkillChart` | Client | Rechartsはクライアント側でレンダリング |

**パターン:** Server Componentでデータ取得し、propsとしてClient Componentに渡す。

```tsx
// app/dashboard/page.tsx (Server Component)
export default async function DashboardPage({ searchParams }) {
  const { from, to, repo } = parseSearchParams(searchParams);
  const kpiData = await getKpiData(from, to, repo);
  const dailyActivity = await getDailyActivity(from, to, repo);
  const skillRanking = await getSkillRanking(from, to, repo);
  const memberSkills = await getMemberSkillRates(from, to, repo);

  return (
    <>
      <KpiCards data={kpiData} />
      <DailyActivityChart data={dailyActivity} />
      <SkillRanking data={skillRanking} />
      <MemberSkillChart data={memberSkills} />
    </>
  );
}
```

---

## ローディング・エラー状態

| 状態 | 表示 |
|---|---|
| ローディング | 各カード・チャートにスケルトンUIを表示（`loading.tsx`） |
| データなし | 「選択期間にデータがありません」メッセージ + 期間変更を促すリンク |
| エラー | 「データの取得に失敗しました」メッセージ + リトライボタン（`error.tsx`） |
