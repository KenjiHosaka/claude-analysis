import {
  sql,
  eq,
  and,
  between,
  count,
  countDistinct,
  sum,
  desc,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sessions,
  tokenUsages,
  skillUsages,
  distributedSkills,
  users,
} from "@/lib/db/schema";
import type {
  TeamKpiAggregate,
  DailyActivityEntry,
  SkillRankingEntry,
  MemberSkillRateEntry,
} from "@claude-analysis/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function repoFilter(repo: string | undefined) {
  return repo ? eq(sessions.project, repo) : undefined;
}

function previousPeriod(from: Date, to: Date) {
  const duration = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - duration);
  return { prevFrom, prevTo };
}

// ---------------------------------------------------------------------------
// getTeamKpi
// ---------------------------------------------------------------------------

export async function getTeamKpi(
  from: Date,
  to: Date,
  repo?: string,
): Promise<TeamKpiAggregate> {
  const { prevFrom, prevTo } = previousPeriod(from, to);

  async function fetchKpi(periodFrom: Date, periodTo: Date) {
    const repoCondition = repoFilter(repo);

    // Session count
    const sessionRows = await db
      .select({ value: count() })
      .from(sessions)
      .where(
        and(
          between(sessions.startedAt, periodFrom, periodTo),
          repoCondition,
        ),
      );
    const sessionCount = sessionRows[0]?.value ?? 0;

    // Total tokens
    const tokenRows = await db
      .select({
        value: sum(
          sql`${tokenUsages.inputTokens} + ${tokenUsages.outputTokens}`,
        ),
      })
      .from(tokenUsages)
      .innerJoin(sessions, eq(tokenUsages.sessionId, sessions.id))
      .where(
        and(
          between(sessions.startedAt, periodFrom, periodTo),
          repoCondition,
        ),
      );
    const totalTokens = Number(tokenRows[0]?.value ?? 0);

    // Skill invocation count
    const skillRows = await db
      .select({ value: count() })
      .from(skillUsages)
      .innerJoin(sessions, eq(skillUsages.sessionId, sessions.id))
      .where(
        and(
          between(sessions.startedAt, periodFrom, periodTo),
          repoCondition,
        ),
      );
    const skillInvocationCount = skillRows[0]?.value ?? 0;

    // Distributed skill adoption rate
    const totalDistRows = await db
      .select({ value: count() })
      .from(distributedSkills);
    const totalDistributed = totalDistRows[0]?.value ?? 0;

    let distributedSkillAdoptionRate = 0;
    if (totalDistributed > 0) {
      const usedDistRows = await db
        .select({
          value: countDistinct(skillUsages.skillName),
        })
        .from(skillUsages)
        .innerJoin(sessions, eq(skillUsages.sessionId, sessions.id))
        .innerJoin(
          distributedSkills,
          eq(skillUsages.skillName, distributedSkills.skillName),
        )
        .where(
          and(
            between(sessions.startedAt, periodFrom, periodTo),
            repoCondition,
          ),
        );
      const usedCount = usedDistRows[0]?.value ?? 0;
      distributedSkillAdoptionRate = usedCount / totalDistributed;
    }

    return {
      sessionCount,
      totalTokens,
      skillInvocationCount,
      distributedSkillAdoptionRate,
    };
  }

  const [current, previous] = await Promise.all([
    fetchKpi(from, to),
    fetchKpi(prevFrom, prevTo),
  ]);

  return {
    ...current,
    previousPeriod: previous,
  };
}

// ---------------------------------------------------------------------------
// getDailyActivity
// ---------------------------------------------------------------------------

export async function getDailyActivity(
  from: Date,
  to: Date,
  repo?: string,
): Promise<DailyActivityEntry[]> {
  const repoCondition = repoFilter(repo);

  const rows = await db
    .select({
      date: sql<string>`DATE(${sessions.startedAt})`.as("date"),
      sessionCount: count().as("session_count"),
      totalTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens} + ${tokenUsages.outputTokens}), 0)`.as(
          "total_tokens",
        ),
    })
    .from(sessions)
    .leftJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(sql`DATE(${sessions.startedAt})`)
    .orderBy(sql`DATE(${sessions.startedAt})`);

  return rows.map((r) => ({
    date: String(r.date),
    sessionCount: r.sessionCount,
    totalTokens: Number(r.totalTokens),
  }));
}

// ---------------------------------------------------------------------------
// getSkillRanking
// ---------------------------------------------------------------------------

export async function getSkillRanking(
  from: Date,
  to: Date,
  repo?: string,
): Promise<SkillRankingEntry[]> {
  const repoCondition = repoFilter(repo);

  const rows = await db
    .select({
      skillName: skillUsages.skillName,
      usageCount: count().as("usage_count"),
      userCount: countDistinct(sessions.userId).as("user_count"),
      distributedId: distributedSkills.id,
    })
    .from(skillUsages)
    .innerJoin(sessions, eq(skillUsages.sessionId, sessions.id))
    .leftJoin(
      distributedSkills,
      eq(skillUsages.skillName, distributedSkills.skillName),
    )
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(skillUsages.skillName, distributedSkills.id)
    .orderBy(desc(count()))
    .limit(10);

  return rows.map((r) => ({
    skillName: r.skillName,
    usageCount: r.usageCount,
    userCount: r.userCount,
    isDistributed: r.distributedId !== null,
  }));
}

// ---------------------------------------------------------------------------
// getMemberSkillRates
// ---------------------------------------------------------------------------

export async function getMemberSkillRates(
  from: Date,
  to: Date,
  repo?: string,
): Promise<MemberSkillRateEntry[]> {
  const repoCondition = repoFilter(repo);

  // Total distributed skills count
  const totalDistRows = await db
    .select({ value: count() })
    .from(distributedSkills);
  const totalDistributedSkillCount = totalDistRows[0]?.value ?? 0;

  // For each user, count distinct distributed skills used in period
  const rows = await db
    .select({
      userId: users.id,
      userName: users.name,
      avatarUrl: users.avatarUrl,
      usedDistributedSkillCount: countDistinct(skillUsages.skillName).as(
        "used_count",
      ),
    })
    .from(users)
    .innerJoin(sessions, eq(sessions.userId, users.id))
    .innerJoin(skillUsages, eq(skillUsages.sessionId, sessions.id))
    .innerJoin(
      distributedSkills,
      eq(skillUsages.skillName, distributedSkills.skillName),
    )
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(users.id, users.name, users.avatarUrl)
    .orderBy(desc(countDistinct(skillUsages.skillName)));

  return rows.map((r) => ({
    userId: r.userId,
    userName: r.userName,
    avatarUrl: r.avatarUrl,
    usedDistributedSkillCount: r.usedDistributedSkillCount,
    totalDistributedSkillCount,
  }));
}
