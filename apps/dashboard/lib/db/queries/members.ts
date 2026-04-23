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
  distributedSkills,
  users,
} from "@/lib/db/schema";
import type { MemberListEntry } from "@claude-analysis/shared";

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
