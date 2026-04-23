import {
  sql,
  eq,
  and,
  between,
  count,
  countDistinct,
  notInArray,
  desc,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sessions,
  skillUsages,
  distributedSkills,
  users,
} from "@/lib/db/schema";
import type {
  SkillKpiAggregate,
  SkillHeatmapAggregate,
  UnusedSkillEntry,
  SkillTrendEntry,
} from "@claude-analysis/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function repoFilter(repo: string | undefined) {
  return repo ? eq(sessions.project, repo) : undefined;
}

// ---------------------------------------------------------------------------
// getSkillKpi
// ---------------------------------------------------------------------------

export async function getSkillKpi(
  from: Date,
  to: Date,
  repo?: string,
): Promise<SkillKpiAggregate> {
  const repoCondition = repoFilter(repo);

  // Total distributed skill count
  const totalRows = await db
    .select({ value: count() })
    .from(distributedSkills);
  const distributedSkillCount = totalRows[0]?.value ?? 0;

  // Distinct distributed skills used in period
  let usedCount = 0;
  if (distributedSkillCount > 0) {
    const usedRows = await db
      .select({ value: countDistinct(skillUsages.skillName) })
      .from(skillUsages)
      .innerJoin(sessions, eq(skillUsages.sessionId, sessions.id))
      .innerJoin(
        distributedSkills,
        eq(skillUsages.skillName, distributedSkills.skillName),
      )
      .where(
        and(between(sessions.startedAt, from, to), repoCondition),
      );
    usedCount = usedRows[0]?.value ?? 0;
  }

  const adoptionRate =
    distributedSkillCount > 0
      ? (usedCount / distributedSkillCount) * 100
      : 0;
  const unusedSkillCount = distributedSkillCount - usedCount;

  return { distributedSkillCount, adoptionRate, unusedSkillCount };
}

// ---------------------------------------------------------------------------
// getSkillHeatmap
// ---------------------------------------------------------------------------

export async function getSkillHeatmap(
  from: Date,
  to: Date,
  repo?: string,
): Promise<SkillHeatmapAggregate> {
  const repoCondition = repoFilter(repo);

  // All distributed skill names
  const skillRows = await db
    .select({ skillName: distributedSkills.skillName })
    .from(distributedSkills)
    .orderBy(distributedSkills.skillName);
  const skills = skillRows.map((r) => r.skillName);

  // All users
  const userRows = await db
    .select({
      userId: users.id,
      userName: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .orderBy(users.name);
  const members = userRows;

  // Usage counts: for distributed skills, group by skill_name + user_id
  const usageRows = await db
    .select({
      skillName: skillUsages.skillName,
      userId: sessions.userId,
      usageCount: count().as("usage_count"),
    })
    .from(skillUsages)
    .innerJoin(sessions, eq(skillUsages.sessionId, sessions.id))
    .innerJoin(
      distributedSkills,
      eq(skillUsages.skillName, distributedSkills.skillName),
    )
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(skillUsages.skillName, sessions.userId);

  // Build a lookup for quick access
  const usageMap = new Map<string, number>();
  for (const row of usageRows) {
    usageMap.set(`${row.skillName}::${row.userId}`, row.usageCount);
  }

  // Build CROSS JOIN matrix (skills x members) with usage counts (including 0)
  const matrix: SkillHeatmapAggregate["matrix"] = [];
  for (const skill of skills) {
    for (const member of members) {
      matrix.push({
        skillName: skill,
        userId: member.userId,
        usageCount: usageMap.get(`${skill}::${member.userId}`) ?? 0,
      });
    }
  }

  return { skills, members, matrix };
}

// ---------------------------------------------------------------------------
// getUnusedSkills
// ---------------------------------------------------------------------------

export async function getUnusedSkills(
  from: Date,
  to: Date,
  repo?: string,
): Promise<UnusedSkillEntry[]> {
  const repoCondition = repoFilter(repo);

  // Get skill names used in the period
  const usedRows = await db
    .select({ skillName: skillUsages.skillName })
    .from(skillUsages)
    .innerJoin(sessions, eq(skillUsages.sessionId, sessions.id))
    .innerJoin(
      distributedSkills,
      eq(skillUsages.skillName, distributedSkills.skillName),
    )
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(skillUsages.skillName);

  const usedNames = usedRows.map((r) => r.skillName);

  // Distributed skills NOT IN used names
  const unusedRows =
    usedNames.length > 0
      ? await db
          .select({
            skillName: distributedSkills.skillName,
            description: distributedSkills.description,
            registeredAt: distributedSkills.registeredAt,
          })
          .from(distributedSkills)
          .where(notInArray(distributedSkills.skillName, usedNames))
          .orderBy(distributedSkills.skillName)
      : await db
          .select({
            skillName: distributedSkills.skillName,
            description: distributedSkills.description,
            registeredAt: distributedSkills.registeredAt,
          })
          .from(distributedSkills)
          .orderBy(distributedSkills.skillName);

  return unusedRows.map((r) => ({
    skillName: r.skillName,
    description: r.description,
    registeredAt: r.registeredAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// getSkillTrend
// ---------------------------------------------------------------------------

export async function getSkillTrend(
  from: Date,
  to: Date,
  repo?: string,
): Promise<SkillTrendEntry[]> {
  const repoCondition = repoFilter(repo);

  const rows = await db
    .select({
      date: sql<string>`TO_CHAR(${skillUsages.invokedAt}::date, 'YYYY-MM-DD')`.as(
        "date",
      ),
      skillName: skillUsages.skillName,
      usageCount: count().as("usage_count"),
    })
    .from(skillUsages)
    .innerJoin(sessions, eq(skillUsages.sessionId, sessions.id))
    .innerJoin(
      distributedSkills,
      eq(skillUsages.skillName, distributedSkills.skillName),
    )
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(sql`${skillUsages.invokedAt}::date`, skillUsages.skillName)
    .orderBy(sql`${skillUsages.invokedAt}::date`);

  return rows.map((r) => ({
    date: r.date,
    skillName: r.skillName,
    usageCount: r.usageCount,
  }));
}

// ---------------------------------------------------------------------------
// getDistributedSkills (for management tab)
// ---------------------------------------------------------------------------

export async function getDistributedSkills() {
  const rows = await db
    .select({
      id: distributedSkills.id,
      skillName: distributedSkills.skillName,
      description: distributedSkills.description,
      registeredAt: distributedSkills.registeredAt,
    })
    .from(distributedSkills)
    .orderBy(desc(distributedSkills.registeredAt));

  return rows.map((r) => ({
    id: r.id,
    skillName: r.skillName,
    description: r.description,
    registeredAt: r.registeredAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// CRUD server actions
// ---------------------------------------------------------------------------

export async function addDistributedSkill(
  skillName: string,
  description?: string,
) {
  await db.insert(distributedSkills).values({
    skillName,
    description: description || null,
  });
}

export async function updateDistributedSkill(
  id: string,
  skillName: string,
  description?: string,
) {
  await db
    .update(distributedSkills)
    .set({ skillName, description: description || null })
    .where(eq(distributedSkills.id, id));
}

export async function deleteDistributedSkill(id: string) {
  await db
    .delete(distributedSkills)
    .where(eq(distributedSkills.id, id));
}
