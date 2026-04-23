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
import { sessions, tokenUsages, users } from "@/lib/db/schema";
import { calculateCost } from "@claude-analysis/shared";
import type {
  CostKpiAggregate,
  DailyCostEntry,
  ModelBreakdownEntry,
  CostByUserEntry,
  CostByProjectEntry,
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
// getCostKpi
// ---------------------------------------------------------------------------

export async function getCostKpi(
  from: Date,
  to: Date,
  repo?: string,
): Promise<CostKpiAggregate> {
  const { prevFrom, prevTo } = previousPeriod(from, to);

  async function fetchKpi(periodFrom: Date, periodTo: Date) {
    const repoCondition = repoFilter(repo);

    // Token totals grouped by model
    const rows = await db
      .select({
        model: tokenUsages.model,
        inputTokens:
          sql<number>`COALESCE(SUM(${tokenUsages.inputTokens}), 0)`.as(
            "input_tokens_sum",
          ),
        outputTokens:
          sql<number>`COALESCE(SUM(${tokenUsages.outputTokens}), 0)`.as(
            "output_tokens_sum",
          ),
        cacheTokens:
          sql<number>`COALESCE(SUM(${tokenUsages.cacheTokens}), 0)`.as(
            "cache_tokens_sum",
          ),
      })
      .from(tokenUsages)
      .innerJoin(sessions, eq(tokenUsages.sessionId, sessions.id))
      .where(
        and(
          between(sessions.startedAt, periodFrom, periodTo),
          repoCondition,
        ),
      )
      .groupBy(tokenUsages.model);

    let totalTokens = 0;
    let estimatedCostUsd = 0;
    let opusTokens = 0;

    for (const row of rows) {
      const input = Number(row.inputTokens);
      const output = Number(row.outputTokens);
      const cache = Number(row.cacheTokens);
      const tokens = input + output + cache;
      totalTokens += tokens;
      estimatedCostUsd += calculateCost(row.model, input, output, cache);
      if (row.model.includes("opus")) {
        opusTokens += tokens;
      }
    }

    const opusRatio = totalTokens > 0 ? opusTokens / totalTokens : 0;

    // Session count for average calculation
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

    const avgSessionCostUsd =
      sessionCount > 0 ? estimatedCostUsd / sessionCount : 0;

    return { totalTokens, estimatedCostUsd, opusRatio, avgSessionCostUsd };
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
// getDailyCost
// ---------------------------------------------------------------------------

export async function getDailyCost(
  from: Date,
  to: Date,
  repo?: string,
): Promise<DailyCostEntry[]> {
  const repoCondition = repoFilter(repo);

  const rows = await db
    .select({
      date: sql<string>`DATE(${sessions.startedAt})`.as("date"),
      model: tokenUsages.model,
      inputTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens}), 0)`.as(
          "input_tokens_sum",
        ),
      outputTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.outputTokens}), 0)`.as(
          "output_tokens_sum",
        ),
      cacheTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.cacheTokens}), 0)`.as(
          "cache_tokens_sum",
        ),
    })
    .from(tokenUsages)
    .innerJoin(sessions, eq(tokenUsages.sessionId, sessions.id))
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(sql`DATE(${sessions.startedAt})`, tokenUsages.model)
    .orderBy(sql`DATE(${sessions.startedAt})`);

  return rows.map((r) => ({
    date: String(r.date),
    model: r.model,
    inputTokens: Number(r.inputTokens),
    outputTokens: Number(r.outputTokens),
    cacheTokens: Number(r.cacheTokens),
  }));
}

// ---------------------------------------------------------------------------
// getModelBreakdown
// ---------------------------------------------------------------------------

export async function getModelBreakdown(
  from: Date,
  to: Date,
  repo?: string,
): Promise<ModelBreakdownEntry[]> {
  const repoCondition = repoFilter(repo);

  const rows = await db
    .select({
      model: tokenUsages.model,
      inputTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens}), 0)`.as(
          "input_tokens_sum",
        ),
      outputTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.outputTokens}), 0)`.as(
          "output_tokens_sum",
        ),
      cacheTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.cacheTokens}), 0)`.as(
          "cache_tokens_sum",
        ),
    })
    .from(tokenUsages)
    .innerJoin(sessions, eq(tokenUsages.sessionId, sessions.id))
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(tokenUsages.model)
    .orderBy(desc(sum(sql`${tokenUsages.inputTokens} + ${tokenUsages.outputTokens} + ${tokenUsages.cacheTokens}`)));

  return rows.map((r) => {
    const input = Number(r.inputTokens);
    const output = Number(r.outputTokens);
    const cache = Number(r.cacheTokens);
    return {
      model: r.model,
      inputTokens: input,
      outputTokens: output,
      cacheTokens: cache,
      totalTokens: input + output + cache,
      estimatedCostUsd: calculateCost(r.model, input, output, cache),
    };
  });
}

// ---------------------------------------------------------------------------
// getCostByUser
// ---------------------------------------------------------------------------

export async function getCostByUser(
  from: Date,
  to: Date,
  repo?: string,
): Promise<CostByUserEntry[]> {
  const repoCondition = repoFilter(repo);

  // Per-user per-model token sums
  const rows = await db
    .select({
      userId: users.id,
      userName: users.name,
      avatarUrl: users.avatarUrl,
      model: tokenUsages.model,
      inputTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens}), 0)`.as(
          "input_tokens_sum",
        ),
      outputTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.outputTokens}), 0)`.as(
          "output_tokens_sum",
        ),
      cacheTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.cacheTokens}), 0)`.as(
          "cache_tokens_sum",
        ),
      sessionCount: countDistinct(sessions.id).as("session_count"),
    })
    .from(users)
    .innerJoin(sessions, eq(sessions.userId, users.id))
    .innerJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(users.id, users.name, users.avatarUrl, tokenUsages.model)
    .orderBy(
      desc(
        sum(
          sql`${tokenUsages.inputTokens} + ${tokenUsages.outputTokens} + ${tokenUsages.cacheTokens}`,
        ),
      ),
    );

  // Assemble nested structure
  const userMap = new Map<
    string,
    CostByUserEntry & { _totalTokens: number }
  >();

  for (const row of rows) {
    const input = Number(row.inputTokens);
    const output = Number(row.outputTokens);
    const cache = Number(row.cacheTokens);

    if (!userMap.has(row.userId)) {
      userMap.set(row.userId, {
        userId: row.userId,
        userName: row.userName,
        avatarUrl: row.avatarUrl,
        sessionCount: row.sessionCount,
        models: [],
        _totalTokens: 0,
      });
    }

    const entry = userMap.get(row.userId)!;
    entry.models.push({
      model: row.model,
      inputTokens: input,
      outputTokens: output,
      cacheTokens: cache,
    });
    entry._totalTokens += input + output + cache;
    // sessionCount is per-model group; take the max across groups
    if (row.sessionCount > entry.sessionCount) {
      entry.sessionCount = row.sessionCount;
    }
  }

  return Array.from(userMap.values())
    .sort((a, b) => b._totalTokens - a._totalTokens)
    .map(({ _totalTokens, ...rest }) => rest);
}

// ---------------------------------------------------------------------------
// getCostByProject
// ---------------------------------------------------------------------------

export async function getCostByProject(
  from: Date,
  to: Date,
  repo?: string,
): Promise<CostByProjectEntry[]> {
  const repoCondition = repoFilter(repo);

  const rows = await db
    .select({
      project: sessions.project,
      model: tokenUsages.model,
      inputTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.inputTokens}), 0)`.as(
          "input_tokens_sum",
        ),
      outputTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.outputTokens}), 0)`.as(
          "output_tokens_sum",
        ),
      cacheTokens:
        sql<number>`COALESCE(SUM(${tokenUsages.cacheTokens}), 0)`.as(
          "cache_tokens_sum",
        ),
      sessionCount: countDistinct(sessions.id).as("session_count"),
    })
    .from(sessions)
    .innerJoin(tokenUsages, eq(tokenUsages.sessionId, sessions.id))
    .where(and(between(sessions.startedAt, from, to), repoCondition))
    .groupBy(sessions.project, tokenUsages.model)
    .orderBy(
      desc(
        sum(
          sql`${tokenUsages.inputTokens} + ${tokenUsages.outputTokens} + ${tokenUsages.cacheTokens}`,
        ),
      ),
    );

  // Assemble nested structure
  const projectMap = new Map<
    string,
    CostByProjectEntry & { _totalTokens: number }
  >();

  for (const row of rows) {
    const input = Number(row.inputTokens);
    const output = Number(row.outputTokens);
    const cache = Number(row.cacheTokens);

    if (!projectMap.has(row.project)) {
      projectMap.set(row.project, {
        project: row.project,
        sessionCount: row.sessionCount,
        models: [],
        _totalTokens: 0,
      });
    }

    const entry = projectMap.get(row.project)!;
    entry.models.push({
      model: row.model,
      inputTokens: input,
      outputTokens: output,
      cacheTokens: cache,
    });
    entry._totalTokens += input + output + cache;
    if (row.sessionCount > entry.sessionCount) {
      entry.sessionCount = row.sessionCount;
    }
  }

  return Array.from(projectMap.values())
    .sort((a, b) => b._totalTokens - a._totalTokens)
    .map(({ _totalTokens, ...rest }) => rest);
}
