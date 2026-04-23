import * as fs from "node:fs";
import * as path from "node:path";
import { glob } from "glob";
import type { CollectPayload } from "@claude-analysis/shared";

type SkillUsageEntry = CollectPayload["skillUsages"][number];

function parseJsonlForSkills(
  filePath: string,
  sessionIds: Set<string>,
): SkillUsageEntry[] {
  const results: SkillUsageEntry[] = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line: string) => line.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Look for tool_use entries with Skill tool
        const toolUse =
          entry.type === "tool_use"
            ? entry
            : entry.content?.find?.(
                (c: Record<string, unknown>) => c.type === "tool_use",
              ) ?? null;

        if (!toolUse) {
          // Also check for nested message content blocks
          const contentBlocks = entry.message?.content ?? entry.content ?? [];
          if (Array.isArray(contentBlocks)) {
            for (const block of contentBlocks) {
              if (
                block.type === "tool_use" &&
                (block.name === "Skill" || block.name === "skill")
              ) {
                const sessionId = resolveSessionId(
                  entry,
                  filePath,
                  sessionIds,
                );
                if (!sessionId) continue;

                const skillName = extractSkillName(block);
                if (!skillName) continue;

                const invokedAt = extractTimestamp(entry);

                results.push({
                  sessionId,
                  skillName,
                  invokedAt,
                });
              }
            }
          }
          continue;
        }

        if (
          toolUse.name !== "Skill" &&
          toolUse.name !== "skill" &&
          !String(toolUse.name ?? "")
            .toLowerCase()
            .includes("skill")
        ) {
          continue;
        }

        const sessionId = resolveSessionId(entry, filePath, sessionIds);
        if (!sessionId) continue;

        const skillName = extractSkillName(toolUse);
        if (!skillName) continue;

        const invokedAt = extractTimestamp(entry);

        results.push({
          sessionId,
          skillName,
          invokedAt,
        });
      } catch {
        continue;
      }
    }
  } catch {
    // Skip unreadable files
  }

  return results;
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

  // Try file name
  const basename = path.basename(filePath, ".jsonl");
  if (sessionIds.has(basename)) {
    return basename;
  }

  return null;
}

function extractSkillName(
  toolUse: Record<string, unknown>,
): string | null {
  const input = toolUse.input as Record<string, unknown> | undefined;
  if (input) {
    if (typeof input.skill === "string") return input.skill;
    if (typeof input.name === "string") return input.name;
    if (typeof input.skillName === "string") return input.skillName;
  }

  // Fall back to tool name if it contains skill info
  const name = toolUse.name as string | undefined;
  if (name && name !== "Skill" && name !== "skill") {
    return name;
  }

  return null;
}

function extractTimestamp(entry: Record<string, unknown>): string {
  const ts =
    (entry.timestamp as string | number) ??
    (entry.created_at as string | number) ??
    (entry.createdAt as string | number) ??
    null;

  if (ts) {
    return new Date(
      typeof ts === "number" && ts < 1e12 ? ts * 1000 : ts,
    ).toISOString();
  }

  return new Date().toISOString();
}

export async function parseSkills(
  claudeDir: string,
  sessionIds: string[],
): Promise<SkillUsageEntry[]> {
  const sessionIdSet = new Set(sessionIds);
  const results: SkillUsageEntry[] = [];

  try {
    const jsonlFiles = await glob(
      path.join(claudeDir, "projects", "**", "*.jsonl"),
    );

    for (const file of jsonlFiles) {
      results.push(...parseJsonlForSkills(file, sessionIdSet));
    }

    const sessionJsonlFiles = await glob(
      path.join(claudeDir, "sessions", "*.jsonl"),
    );

    for (const file of sessionJsonlFiles) {
      results.push(...parseJsonlForSkills(file, sessionIdSet));
    }
  } catch {
    // If glob fails, return empty
  }

  return results;
}
