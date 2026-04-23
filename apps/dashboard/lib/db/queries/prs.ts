import {
  sql,
  eq,
  and,
  between,
  count,
  countDistinct,
  desc,
  ilike,
  isNull,
  isNotNull,
  or,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  pullRequests,
  repositories,
  prSessions,
  sessions,
  skillUsages,
  tokenUsages,
  subagentUsages,
  distributedSkills,
} from "@/lib/db/schema";
import type {
  PrKpiAggregate,
  PrListEntry,
  PrDetailAggregate,
} from "@claude-analysis/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function repoFilter(repo: string | undefined) {
  if (!repo) return undefined;
  const [owner, name] = repo.includes("/")
    ? repo.split("/", 2)
    : [undefined, undefined];
  if (owner && name) {
    return and(eq(repositories.owner, owner), eq(repositories.name, name));
  }
  return eq(repositories.name, repo);
}

function statusFilter(status: string | undefined) {
  switch (status) {
    case "merged":
      return isNotNull(pullRequests.mergedAt);
    case "open":
      return and(
        isNull(pullRequests.mergedAt),
        isNull(pullRequests.closedAt),
      );
    case "closed":
      return and(
        isNotNull(pullRequests.closedAt),
        isNull(pullRequests.mergedAt),
      );
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// getPrKpi
// ---------------------------------------------------------------------------

export async function getPrKpi(
  from: Date,
  to: Date,
  repo?: string,
): Promise<PrKpiAggregate> {
  const repoCondition = repoFilter(repo);

  // Total PR count in period
  const totalRows = await db
    .select({ value: count() })
    .from(pullRequests)
    .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
    .where(
      and(between(pullRequests.createdAt, from, to), repoCondition),
    );
  const totalPrCount = totalRows[0]?.value ?? 0;

  if (totalPrCount === 0) {
    return { totalPrCount: 0, prsWithSkillsRate: 0, avgSkillsPerPr: 0 };
  }

  // PRs that have at least one skill usage (via prSessions -> sessions -> skillUsages)
  const prsWithSkillsRows = await db
    .select({
      value: countDistinct(pullRequests.id),
    })
    .from(pullRequests)
    .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
    .innerJoin(prSessions, eq(prSessions.pullRequestId, pullRequests.id))
    .innerJoin(sessions, eq(prSessions.sessionId, sessions.id))
    .innerJoin(skillUsages, eq(skillUsages.sessionId, sessions.id))
    .where(
      and(between(pullRequests.createdAt, from, to), repoCondition),
    );
  const prsWithSkills = prsWithSkillsRows[0]?.value ?? 0;
  const prsWithSkillsRate =
    totalPrCount > 0 ? (prsWithSkills / totalPrCount) * 100 : 0;

  // Average distinct skills per PR
  const avgRows = await db
    .select({
      value:
        sql<number>`AVG(sub.skill_count)`.as("avg_skills"),
    })
    .from(
      sql`(
        SELECT ${pullRequests.id} AS pr_id,
               COUNT(DISTINCT ${skillUsages.skillName}) AS skill_count
        FROM ${pullRequests}
        INNER JOIN ${repositories} ON ${pullRequests.repositoryId} = ${repositories.id}
        LEFT JOIN ${prSessions} ON ${prSessions.pullRequestId} = ${pullRequests.id}
        LEFT JOIN ${sessions} ON ${prSessions.sessionId} = ${sessions.id}
        LEFT JOIN ${skillUsages} ON ${skillUsages.sessionId} = ${sessions.id}
        WHERE ${pullRequests.createdAt} BETWEEN ${from} AND ${to}
        ${repoCondition ? sql`AND ${repoCondition}` : sql``}
        GROUP BY ${pullRequests.id}
      ) AS sub`,
    );
  const avgSkillsPerPr = Number(avgRows[0]?.value ?? 0);

  return { totalPrCount, prsWithSkillsRate, avgSkillsPerPr };
}

// ---------------------------------------------------------------------------
// getPrList
// ---------------------------------------------------------------------------

export async function getPrList(
  from: Date,
  to: Date,
  repo?: string,
  status?: string,
  q?: string,
  limit = 20,
  offset = 0,
): Promise<{ rows: PrListEntry[]; totalCount: number }> {
  const repoCondition = repoFilter(repo);
  const statusCondition = statusFilter(status);

  // Search condition: title ILIKE or pr_number match
  let searchCondition;
  if (q && q.trim()) {
    const trimmed = q.trim();
    const numericVal = Number(trimmed);
    if (!isNaN(numericVal) && Number.isInteger(numericVal)) {
      searchCondition = or(
        ilike(pullRequests.title, `%${trimmed}%`),
        eq(pullRequests.prNumber, numericVal),
      );
    } else {
      searchCondition = ilike(pullRequests.title, `%${trimmed}%`);
    }
  }

  const whereClause = and(
    between(pullRequests.createdAt, from, to),
    repoCondition,
    statusCondition,
    searchCondition,
  );

  // Count
  const countRows = await db
    .select({ value: count() })
    .from(pullRequests)
    .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
    .where(whereClause);
  const totalCount = countRows[0]?.value ?? 0;

  // List with aggregates
  const rows = await db
    .select({
      prId: pullRequests.id,
      prNumber: pullRequests.prNumber,
      title: pullRequests.title,
      author: pullRequests.author,
      branch: pullRequests.branch,
      repoOwner: repositories.owner,
      repoName: repositories.name,
      createdAt: pullRequests.createdAt,
      mergedAt: pullRequests.mergedAt,
      closedAt: pullRequests.closedAt,
      uniqueSkillCount:
        sql<number>`COUNT(DISTINCT ${skillUsages.skillName})`.as(
          "unique_skill_count",
        ),
      totalTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens} + ${tokenUsages.outputTokens}), 0)`.as(
          "total_tokens",
        ),
    })
    .from(pullRequests)
    .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
    .leftJoin(prSessions, eq(prSessions.pullRequestId, pullRequests.id))
    .leftJoin(sessions, eq(prSessions.sessionId, sessions.id))
    .leftJoin(skillUsages, eq(skillUsages.sessionId, sessions.id))
    .leftJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .where(whereClause)
    .groupBy(
      pullRequests.id,
      pullRequests.prNumber,
      pullRequests.title,
      pullRequests.author,
      pullRequests.branch,
      repositories.owner,
      repositories.name,
      pullRequests.createdAt,
      pullRequests.mergedAt,
      pullRequests.closedAt,
    )
    .orderBy(desc(pullRequests.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    rows: rows.map((r) => ({
      prId: r.prId,
      prNumber: r.prNumber,
      title: r.title,
      author: r.author,
      branch: r.branch,
      repoOwner: r.repoOwner,
      repoName: r.repoName,
      createdAt: r.createdAt.toISOString(),
      mergedAt: r.mergedAt ? r.mergedAt.toISOString() : null,
      closedAt: r.closedAt ? r.closedAt.toISOString() : null,
      uniqueSkillCount: Number(r.uniqueSkillCount),
      totalTokens: Number(r.totalTokens),
    })),
    totalCount,
  };
}

// ---------------------------------------------------------------------------
// getPrDetail
// ---------------------------------------------------------------------------

export async function getPrDetail(
  prId: string,
): Promise<PrDetailAggregate | null> {
  // 1. PR info
  const prRows = await db
    .select({
      prNumber: pullRequests.prNumber,
      title: pullRequests.title,
      author: pullRequests.author,
      branch: pullRequests.branch,
      repoOwner: repositories.owner,
      repoName: repositories.name,
      createdAt: pullRequests.createdAt,
      mergedAt: pullRequests.mergedAt,
    })
    .from(pullRequests)
    .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
    .where(eq(pullRequests.id, prId))
    .limit(1);

  if (prRows.length === 0) return null;
  const pr = prRows[0];

  // 2. Skills used (distinct skill names with usage count and isDistributed flag)
  const skillRows = await db
    .select({
      skillName: skillUsages.skillName,
      usageCount: count(skillUsages.id).as("usage_count"),
      isDistributed:
        sql<boolean>`BOOL_OR(${distributedSkills.id} IS NOT NULL)`.as(
          "is_distributed",
        ),
    })
    .from(prSessions)
    .innerJoin(sessions, eq(prSessions.sessionId, sessions.id))
    .innerJoin(skillUsages, eq(skillUsages.sessionId, sessions.id))
    .leftJoin(
      distributedSkills,
      eq(distributedSkills.skillName, skillUsages.skillName),
    )
    .where(eq(prSessions.pullRequestId, prId))
    .groupBy(skillUsages.skillName)
    .orderBy(desc(sql`usage_count`));

  // 3. Related sessions
  const sessionRows = await db
    .select({
      sessionId: sessions.id,
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
    .from(prSessions)
    .innerJoin(sessions, eq(prSessions.sessionId, sessions.id))
    .leftJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .leftJoin(skillUsages, eq(skillUsages.sessionId, sessions.id))
    .leftJoin(subagentUsages, eq(subagentUsages.sessionId, sessions.id))
    .where(eq(prSessions.pullRequestId, prId))
    .groupBy(sessions.id, sessions.startedAt, sessions.endedAt)
    .orderBy(desc(sessions.startedAt));

  return {
    pr: {
      prNumber: pr.prNumber,
      title: pr.title,
      author: pr.author,
      branch: pr.branch,
      repoOwner: pr.repoOwner,
      repoName: pr.repoName,
      createdAt: pr.createdAt.toISOString(),
      mergedAt: pr.mergedAt ? pr.mergedAt.toISOString() : null,
    },
    skills: skillRows.map((r) => ({
      skillName: r.skillName,
      usageCount: r.usageCount,
      isDistributed: r.isDistributed,
    })),
    sessions: sessionRows.map((r) => ({
      sessionId: r.sessionId,
      startedAt: r.startedAt.toISOString(),
      endedAt: r.endedAt ? r.endedAt.toISOString() : null,
      totalTokens: Number(r.totalTokens),
      skillCount: Number(r.skillCount),
      subagentCount: Number(r.subagentCount),
    })),
  };
}
