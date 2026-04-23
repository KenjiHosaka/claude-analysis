import { eq, and, isNull } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { CollectPayload } from "@claude-analysis/shared";
import { db } from "@/lib/db";
import {
  sessions,
  tokenUsages,
  skillUsages,
  subagentUsages,
  pullRequests,
  prSessions,
  apiKeys,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// API key authentication
// ---------------------------------------------------------------------------

export async function authenticateApiKey(
  key: string,
): Promise<string | null> {
  const keyHash = createHash("sha256").update(key).digest("hex");

  const rows = await db
    .select({ userId: apiKeys.userId })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  return rows.length > 0 ? rows[0].userId : null;
}

// ---------------------------------------------------------------------------
// Data ingestion
// ---------------------------------------------------------------------------

export async function ingestData(
  userId: string,
  payload: CollectPayload,
): Promise<void> {
  // Map external session IDs to internal UUIDs
  const sessionIdMap = new Map<string, string>();

  // ---- Upsert sessions ----
  for (const s of payload.sessions) {
    const existing = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.externalId, s.sessionId))
      .limit(1);

    if (existing.length > 0) {
      // Update endedAt if the session already exists
      if (s.endedAt) {
        await db
          .update(sessions)
          .set({ endedAt: new Date(s.endedAt) })
          .where(eq(sessions.id, existing[0].id));
      }
      sessionIdMap.set(s.sessionId, existing[0].id);
    } else {
      const inserted = await db
        .insert(sessions)
        .values({
          externalId: s.sessionId,
          userId,
          project: s.project,
          branch: s.branch,
          startedAt: new Date(s.startedAt),
          endedAt: s.endedAt ? new Date(s.endedAt) : null,
          sessionKind: s.sessionKind,
        })
        .returning({ id: sessions.id });

      sessionIdMap.set(s.sessionId, inserted[0].id);
    }
  }

  // ---- Insert token usages ----
  if (payload.tokenUsages.length > 0) {
    await db.insert(tokenUsages).values(
      payload.tokenUsages.map((t) => ({
        sessionId: sessionIdMap.get(t.sessionId)!,
        model: t.model,
        inputTokens: t.inputTokens,
        outputTokens: t.outputTokens,
        cacheTokens: t.cacheTokens,
      })),
    );
  }

  // ---- Insert skill usages ----
  if (payload.skillUsages.length > 0) {
    await db.insert(skillUsages).values(
      payload.skillUsages.map((s) => ({
        sessionId: sessionIdMap.get(s.sessionId)!,
        skillName: s.skillName,
        invokedAt: new Date(s.invokedAt),
      })),
    );
  }

  // ---- Insert subagent usages ----
  if (payload.subagentUsages.length > 0) {
    await db.insert(subagentUsages).values(
      payload.subagentUsages.map((a) => ({
        sessionId: sessionIdMap.get(a.sessionId)!,
        agentType: a.agentType,
        toolCallsCount: a.toolCallsCount,
        tokensUsed: a.tokensUsed,
      })),
    );
  }

  // ---- Link sessions to PRs by branch ----
  for (const s of payload.sessions) {
    if (!s.branch) continue;

    const internalSessionId = sessionIdMap.get(s.sessionId)!;

    const matchingPrs = await db
      .select({ id: pullRequests.id })
      .from(pullRequests)
      .where(eq(pullRequests.branch, s.branch));

    for (const pr of matchingPrs) {
      // Check if already linked
      const existingLink = await db
        .select({ id: prSessions.id })
        .from(prSessions)
        .where(
          and(
            eq(prSessions.pullRequestId, pr.id),
            eq(prSessions.sessionId, internalSessionId),
          ),
        )
        .limit(1);

      if (existingLink.length === 0) {
        await db.insert(prSessions).values({
          pullRequestId: pr.id,
          sessionId: internalSessionId,
        });
      }
    }
  }
}
