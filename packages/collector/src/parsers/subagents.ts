import * as fs from "node:fs";
import * as path from "node:path";
import { glob } from "glob";
import type { CollectPayload } from "@claude-analysis/shared";

type SubagentUsageEntry = CollectPayload["subagentUsages"][number];

type AggregationKey = string; // `${sessionId}:${agentType}`
type AggregationMap = Map<
  AggregationKey,
  {
    sessionId: string;
    agentType: string;
    toolCallsCount: number;
    tokensUsed: number;
  }
>;

function parseJsonlForSubagents(
  filePath: string,
  sessionIds: Set<string>,
  aggregation: AggregationMap,
): void {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line: string) => line.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Look for Agent tool_use entries in various content shapes
        const contentBlocks = extractContentBlocks(entry);

        for (const block of contentBlocks) {
          if (block.type !== "tool_use") continue;

          const name = String(block.name ?? "");
          if (
            name !== "Agent" &&
            name !== "agent" &&
            !name.toLowerCase().includes("subagent") &&
            !name.toLowerCase().includes("sub_agent")
          ) {
            continue;
          }

          const sessionId = resolveSessionId(entry, filePath, sessionIds);
          if (!sessionId) continue;

          const agentType = extractAgentType(block);
          const toolCalls = extractToolCallsCount(block);
          const tokens = extractTokensUsed(block);

          const key: AggregationKey = `${sessionId}:${agentType}`;
          const existing = aggregation.get(key);

          if (existing) {
            existing.toolCallsCount += toolCalls;
            existing.tokensUsed += tokens;
          } else {
            aggregation.set(key, {
              sessionId,
              agentType,
              toolCallsCount: toolCalls,
              tokensUsed: tokens,
            });
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Skip unreadable files
  }
}

function extractContentBlocks(
  entry: Record<string, unknown>,
): Record<string, unknown>[] {
  // Direct tool_use
  if (entry.type === "tool_use") {
    return [entry];
  }

  // Nested in content array
  const message = entry.message as Record<string, unknown> | undefined;
  const content =
    (entry.content as Record<string, unknown>[]) ??
    (message?.content as Record<string, unknown>[] | undefined) ??
    [];

  if (Array.isArray(content)) {
    return content.filter(
      (c): c is Record<string, unknown> =>
        typeof c === "object" && c !== null,
    );
  }

  return [];
}

function resolveSessionId(
  entry: Record<string, unknown>,
  filePath: string,
  sessionIds: Set<string>,
): string | null {
  const sessionId =
    (entry.sessionId as string) ??
    (entry.session_id as string) ??
    (entry.conversationId as string) ??
    null;

  if (sessionId && sessionIds.has(String(sessionId))) {
    return String(sessionId);
  }

  const basename = path.basename(filePath, ".jsonl");
  if (sessionIds.has(basename)) {
    return basename;
  }

  return null;
}

function extractAgentType(block: Record<string, unknown>): string {
  const input = block.input as Record<string, unknown> | undefined;
  if (input) {
    if (typeof input.subagent_type === "string") return input.subagent_type;
    if (typeof input.agentType === "string") return input.agentType;
    if (typeof input.type === "string") return input.type;
    if (typeof input.description === "string") {
      // Use first 50 chars of description as agent type
      return input.description.slice(0, 50);
    }
    if (typeof input.prompt === "string") {
      return "task-agent";
    }
  }
  return "unknown";
}

function extractToolCallsCount(block: Record<string, unknown>): number {
  const input = block.input as Record<string, unknown> | undefined;
  const result = block.result as Record<string, unknown> | undefined;

  if (result) {
    if (typeof result.toolCallsCount === "number") return result.toolCallsCount;
    if (typeof result.tool_calls_count === "number")
      return result.tool_calls_count;
  }

  if (input) {
    if (typeof input.toolCallsCount === "number") return input.toolCallsCount;
  }

  // Count as one invocation if we can't determine the exact count
  return 1;
}

function extractTokensUsed(block: Record<string, unknown>): number {
  const result = block.result as Record<string, unknown> | undefined;

  if (result) {
    if (typeof result.tokensUsed === "number") return result.tokensUsed;
    if (typeof result.tokens_used === "number") return result.tokens_used;
    if (typeof result.totalTokens === "number") return result.totalTokens;
  }

  return 0;
}

export async function parseSubagents(
  claudeDir: string,
  sessionIds: string[],
): Promise<SubagentUsageEntry[]> {
  const sessionIdSet = new Set(sessionIds);
  const aggregation: AggregationMap = new Map();

  try {
    const jsonlFiles = await glob(
      path.join(claudeDir, "projects", "**", "*.jsonl"),
    );

    for (const file of jsonlFiles) {
      parseJsonlForSubagents(file, sessionIdSet, aggregation);
    }

    const sessionJsonlFiles = await glob(
      path.join(claudeDir, "sessions", "*.jsonl"),
    );

    for (const file of sessionJsonlFiles) {
      parseJsonlForSubagents(file, sessionIdSet, aggregation);
    }
  } catch {
    // If glob fails, return empty
  }

  return Array.from(aggregation.values());
}
