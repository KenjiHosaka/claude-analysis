import {
  sql,
  eq,
  and,
  between,
  count,
  countDistinct,
  desc,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sessions,
  tokenUsages,
  skillUsages,
  subagentUsages,
  distributedSkills,
  users,
} from "@/lib/db/schema";
import type { MemberListEntry, MemberDetailAggregate } from "@claude-analysis/shared";

// ---------------------------------------------------------------------------
// getMemberList
// ---------------------------------------------------------------------------

export async function getMemberList(
  from: Date,
  to: Date,
  limit: number,
  offset: number,
): Promise<MemberListEntry[]> {
  const totalDistRows = await db
    .select({ value: count() })
    .from(distributedSkills);
  const totalDistributed = totalDistRows[0]?.value ?? 0;

  const rows = await db
    .select({
      userId: users.id,
      userName: users.name,
      avatarUrl: users.avatarUrl,
      sessionCount: countDistinct(sessions.id).as("session_count"),
      totalTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens} + ${tokenUsages.outputTokens}), 0)`.as(
          "total_tokens",
        ),
      usedDistributed:
        sql<number>`COUNT(DISTINCT CASE WHEN ${distributedSkills.id} IS NOT NULL THEN ${skillUsages.skillName} END)`.as(
          "used_distributed",
        ),
      lastActivity: sql<string | null>`MAX(${sessions.startedAt})`.as(
        "last_activity",
      ),
    })
    .from(users)
    .leftJoin(
      sessions,
      and(
        eq(sessions.userId, users.id),
        between(sessions.startedAt, from, to),
      ),
    )
    .leftJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .leftJoin(skillUsages, eq(skillUsages.sessionId, sessions.id))
    .leftJoin(
      distributedSkills,
      eq(distributedSkills.skillName, skillUsages.skillName),
    )
    .groupBy(users.id, users.name, users.avatarUrl)
    .orderBy(desc(sql`total_tokens`))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    userId: r.userId,
    userName: r.userName,
    avatarUrl: r.avatarUrl,
    sessionCount: r.sessionCount,
    totalTokens: Number(r.totalTokens),
    distributedSkillAdoptionRate:
      totalDistributed > 0 ? r.usedDistributed / totalDistributed : 0,
    lastActivityAt: r.lastActivity
      ? new Date(r.lastActivity).toISOString()
      : null,
  }));
}

// ---------------------------------------------------------------------------
// getMemberCount
// ---------------------------------------------------------------------------

export async function getMemberCount(): Promise<number> {
  const rows = await db.select({ value: count() }).from(users);
  return rows[0]?.value ?? 0;
}

// ---------------------------------------------------------------------------
// getMemberDetail
// ---------------------------------------------------------------------------

export async function getMemberDetail(
  userId: string,
  from: Date,
  to: Date,
): Promise<MemberDetailAggregate | null> {
  // Compute previous period (same duration, immediately before `from`)
  const durationMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - durationMs);
  const prevTo = from;

  // 1. User info
  const userRows = await db
    .select({
      userId: users.id,
      userName: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRows.length === 0) return null;
  const user = userRows[0];

  // Total distributed skill count (for adoption rate)
  const totalDistRows = await db
    .select({ value: count() })
    .from(distributedSkills);
  const totalDistributed = totalDistRows[0]?.value ?? 0;

  // 2. KPI — current period
  const currentKpiRows = await db
    .select({
      sessionCount: countDistinct(sessions.id).as("session_count"),
      totalTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens} + ${tokenUsages.outputTokens}), 0)`.as(
          "total_tokens",
        ),
      skillInvocationCount: count(skillUsages.id).as("skill_invocation_count"),
      usedDistributed:
        sql<number>`COUNT(DISTINCT CASE WHEN ${distributedSkills.id} IS NOT NULL THEN ${skillUsages.skillName} END)`.as(
          "used_distributed",
        ),
    })
    .from(sessions)
    .leftJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .leftJoin(skillUsages, eq(skillUsages.sessionId, sessions.id))
    .leftJoin(
      distributedSkills,
      eq(distributedSkills.skillName, skillUsages.skillName),
    )
    .where(
      and(
        eq(sessions.userId, userId),
        between(sessions.startedAt, from, to),
      ),
    );

  const cur = currentKpiRows[0];

  // KPI — previous period
  const prevKpiRows = await db
    .select({
      sessionCount: countDistinct(sessions.id).as("session_count"),
      totalTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens} + ${tokenUsages.outputTokens}), 0)`.as(
          "total_tokens",
        ),
      skillInvocationCount: count(skillUsages.id).as("skill_invocation_count"),
      usedDistributed:
        sql<number>`COUNT(DISTINCT CASE WHEN ${distributedSkills.id} IS NOT NULL THEN ${skillUsages.skillName} END)`.as(
          "used_distributed",
        ),
    })
    .from(sessions)
    .leftJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .leftJoin(skillUsages, eq(skillUsages.sessionId, sessions.id))
    .leftJoin(
      distributedSkills,
      eq(distributedSkills.skillName, skillUsages.skillName),
    )
    .where(
      and(
        eq(sessions.userId, userId),
        between(sessions.startedAt, prevFrom, prevTo),
      ),
    );

  const prev = prevKpiRows[0];

  // 3. Daily trend
  const dailyTrendRows = await db
    .select({
      date: sql<string>`TO_CHAR(${sessions.startedAt}::date, 'YYYY-MM-DD')`.as(
        "date",
      ),
      sessionCount: countDistinct(sessions.id).as("session_count"),
      totalTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens} + ${tokenUsages.outputTokens}), 0)`.as(
          "total_tokens",
        ),
    })
    .from(sessions)
    .leftJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, userId),
        between(sessions.startedAt, from, to),
      ),
    )
    .groupBy(sql`${sessions.startedAt}::date`)
    .orderBy(sql`${sessions.startedAt}::date`);

  // 4. Skill ranking
  const skillRankingRows = await db
    .select({
      skillName: skillUsages.skillName,
      usageCount: count(skillUsages.id).as("usage_count"),
      isDistributed:
        sql<boolean>`BOOL_OR(${distributedSkills.id} IS NOT NULL)`.as(
          "is_distributed",
        ),
    })
    .from(skillUsages)
    .innerJoin(sessions, eq(sessions.id, skillUsages.sessionId))
    .leftJoin(
      distributedSkills,
      eq(distributedSkills.skillName, skillUsages.skillName),
    )
    .where(
      and(
        eq(sessions.userId, userId),
        between(sessions.startedAt, from, to),
      ),
    )
    .groupBy(skillUsages.skillName)
    .orderBy(desc(sql`usage_count`))
    .limit(10);

  // 5. Project breakdown
  const projectBreakdownRows = await db
    .select({
      project: sessions.project,
      sessionCount: countDistinct(sessions.id).as("session_count"),
      totalTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens} + ${tokenUsages.outputTokens}), 0)`.as(
          "total_tokens",
        ),
    })
    .from(sessions)
    .leftJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, userId),
        between(sessions.startedAt, from, to),
      ),
    )
    .groupBy(sessions.project)
    .orderBy(desc(sql`session_count`))
    .limit(8);

  // 6. Subagent breakdown
  const subagentBreakdownRows = await db
    .select({
      agentType: subagentUsages.agentType,
      toolCallsCount:
        sql<number>`COALESCE(SUM(${subagentUsages.toolCallsCount}), 0)`.as(
          "tool_calls_count",
        ),
      tokensUsed:
        sql<number>`COALESCE(SUM(${subagentUsages.tokensUsed}), 0)`.as(
          "tokens_used",
        ),
    })
    .from(subagentUsages)
    .innerJoin(sessions, eq(sessions.id, subagentUsages.sessionId))
    .where(
      and(
        eq(sessions.userId, userId),
        between(sessions.startedAt, from, to),
      ),
    )
    .groupBy(subagentUsages.agentType)
    .orderBy(desc(sql`tool_calls_count`));

  // 7. Recent sessions
  const recentSessionRows = await db
    .select({
      sessionId: sessions.id,
      project: sessions.project,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      totalTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens} + ${tokenUsages.outputTokens}), 0)`.as(
          "total_tokens",
        ),
      skillCount:
        sql<number>`COUNT(DISTINCT ${skillUsages.id})`.as("skill_count"),
      subagentCount:
        sql<number>`COUNT(DISTINCT ${subagentUsages.id})`.as("subagent_count"),
    })
    .from(sessions)
    .leftJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .leftJoin(skillUsages, eq(skillUsages.sessionId, sessions.id))
    .leftJoin(subagentUsages, eq(subagentUsages.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, userId),
        between(sessions.startedAt, from, to),
      ),
    )
    .groupBy(sessions.id, sessions.project, sessions.startedAt, sessions.endedAt)
    .orderBy(desc(sessions.startedAt))
    .limit(20);

  return {
    user,
    kpi: {
      sessionCount: cur.sessionCount,
      totalTokens: Number(cur.totalTokens),
      skillInvocationCount: cur.skillInvocationCount,
      distributedSkillAdoptionRate:
        totalDistributed > 0 ? cur.usedDistributed / totalDistributed : 0,
      previousPeriod: {
        sessionCount: prev.sessionCount,
        totalTokens: Number(prev.totalTokens),
        skillInvocationCount: prev.skillInvocationCount,
        distributedSkillAdoptionRate:
          totalDistributed > 0 ? prev.usedDistributed / totalDistributed : 0,
      },
    },
    dailyTrend: dailyTrendRows.map((r) => ({
      date: r.date,
      sessionCount: r.sessionCount,
      totalTokens: Number(r.totalTokens),
    })),
    skillRanking: skillRankingRows.map((r) => ({
      skillName: r.skillName,
      usageCount: r.usageCount,
      isDistributed: r.isDistributed,
    })),
    projectBreakdown: projectBreakdownRows.map((r) => ({
      project: r.project,
      sessionCount: r.sessionCount,
      totalTokens: Number(r.totalTokens),
    })),
    subagentBreakdown: subagentBreakdownRows.map((r) => ({
      agentType: r.agentType,
      toolCallsCount: Number(r.toolCallsCount),
      tokensUsed: Number(r.tokensUsed),
    })),
    recentSessions: recentSessionRows.map((r) => ({
      sessionId: r.sessionId,
      project: r.project,
      startedAt: r.startedAt.toISOString(),
      endedAt: r.endedAt ? r.endedAt.toISOString() : null,
      totalTokens: Number(r.totalTokens),
      skillCount: Number(r.skillCount),
      subagentCount: Number(r.subagentCount),
    })),
  };
}
