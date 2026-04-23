import * as fs from "node:fs";
import * as path from "node:path";
import { glob } from "glob";
import type { CollectPayload } from "@claude-analysis/shared";

type TokenUsageEntry = CollectPayload["tokenUsages"][number];

type AggregationKey = string; // `${sessionId}:${model}`
type AggregationMap = Map<
  AggregationKey,
  {
    sessionId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheTokens: number;
  }
>;

function parseJsonlFile(
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

        // Try to extract session ID from various locations
        const sessionId =
          entry.sessionId ??
          entry.session_id ??
          entry.conversationId ??
          null;

        // Try multiple token/usage data shapes
        const model =
          entry.model ??
          entry.costInfo?.model ??
          entry.usage?.model ??
          entry.message?.model ??
          null;

        if (!model) continue;

        // Extract token counts from various possible shapes
        let inputTokens = 0;
        let outputTokens = 0;
        let cacheTokens = 0;

        if (entry.usage) {
          inputTokens = entry.usage.input_tokens ?? entry.usage.inputTokens ?? 0;
          outputTokens =
            entry.usage.output_tokens ?? entry.usage.outputTokens ?? 0;
          cacheTokens =
            entry.usage.cache_read_input_tokens ??
            entry.usage.cache_creation_input_tokens ??
            entry.usage.cacheTokens ??
            0;
        } else if (entry.costInfo) {
          inputTokens =
            entry.costInfo.input_tokens ?? entry.costInfo.inputTokens ?? 0;
          outputTokens =
            entry.costInfo.output_tokens ?? entry.costInfo.outputTokens ?? 0;
          cacheTokens =
            entry.costInfo.cache_read_input_tokens ??
            entry.costInfo.cacheTokens ??
            0;
        } else if (entry.message?.usage) {
          const u = entry.message.usage;
          inputTokens = u.input_tokens ?? u.inputTokens ?? 0;
          outputTokens = u.output_tokens ?? u.outputTokens ?? 0;
          cacheTokens =
            u.cache_read_input_tokens ??
            u.cache_creation_input_tokens ??
            u.cacheTokens ??
            0;
        } else {
          // Direct fields
          inputTokens =
            entry.input_tokens ?? entry.inputTokens ?? 0;
          outputTokens =
            entry.output_tokens ?? entry.outputTokens ?? 0;
          cacheTokens =
            entry.cache_read_input_tokens ?? entry.cacheTokens ?? 0;
        }

        if (inputTokens === 0 && outputTokens === 0 && cacheTokens === 0) {
          continue;
        }

        // Determine which session this belongs to
        let matchedSessionId: string | null = null;

        if (sessionId && sessionIds.has(String(sessionId))) {
          matchedSessionId = String(sessionId);
        } else if (sessionIds.size > 0) {
          // Try to infer session from file path
          // Files are often in ~/.claude/projects/<project>/<sessionId>.jsonl
          const basename = path.basename(filePath, ".jsonl");
          if (sessionIds.has(basename)) {
            matchedSessionId = basename;
          }
        }

        if (!matchedSessionId) continue;

        const key: AggregationKey = `${matchedSessionId}:${model}`;
        const existing = aggregation.get(key);

        if (existing) {
          existing.inputTokens += inputTokens;
          existing.outputTokens += outputTokens;
          existing.cacheTokens += cacheTokens;
        } else {
          aggregation.set(key, {
            sessionId: matchedSessionId,
            model: String(model),
            inputTokens,
            outputTokens,
            cacheTokens,
          });
        }
      } catch {
        // Skip unparseable lines
        continue;
      }
    }
  } catch {
    // Skip unreadable files
  }
}

export async function parseTokens(
  claudeDir: string,
  sessionIds: string[],
): Promise<TokenUsageEntry[]> {
  const sessionIdSet = new Set(sessionIds);
  const aggregation: AggregationMap = new Map();

  try {
    // Look for JSONL files in project directories
    const jsonlFiles = await glob(
      path.join(claudeDir, "projects", "**", "*.jsonl"),
    );

    for (const file of jsonlFiles) {
      parseJsonlFile(file, sessionIdSet, aggregation);
    }

    // Also check for session-specific JSONL files
    const sessionJsonlFiles = await glob(
      path.join(claudeDir, "sessions", "*.jsonl"),
    );

    for (const file of sessionJsonlFiles) {
      parseJsonlFile(file, sessionIdSet, aggregation);
    }
  } catch {
    // If glob fails, return empty
  }

  return Array.from(aggregation.values());
}
