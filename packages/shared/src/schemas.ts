import { z } from "zod";

// ---------------------------------------------------------------------------
// Collect API payload schema
// ---------------------------------------------------------------------------

export const collectPayloadSchema = z.object({
  sessions: z.array(
    z.object({
      sessionId: z.string(),
      project: z.string(),
      branch: z.string().nullable(),
      startedAt: z.string().datetime(),
      endedAt: z.string().datetime().nullable(),
      sessionKind: z.string(),
    }),
  ),
  tokenUsages: z.array(
    z.object({
      sessionId: z.string(),
      model: z.string(),
      inputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
      cacheTokens: z.number().int().nonnegative(),
    }),
  ),
  skillUsages: z.array(
    z.object({
      sessionId: z.string(),
      skillName: z.string(),
      invokedAt: z.string().datetime(),
    }),
  ),
  subagentUsages: z.array(
    z.object({
      sessionId: z.string(),
      agentType: z.string(),
      toolCallsCount: z.number().int().nonnegative(),
      tokensUsed: z.number().int().nonnegative(),
    }),
  ),
});

// ---------------------------------------------------------------------------
// Distributed skill schema
// ---------------------------------------------------------------------------

export const distributedSkillSchema = z.object({
  skillName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Repository schema
// ---------------------------------------------------------------------------

export const repositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
});
