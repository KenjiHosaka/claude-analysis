import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { glob } from "glob";
import type { CollectPayload } from "@claude-analysis/shared";

type SessionEntry = CollectPayload["sessions"][number];

function getBranch(cwd: string): string | null {
  try {
    if (!fs.existsSync(cwd)) return null;
    const branch = execSync(`git -C "${cwd}" branch --show-current`, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

function extractProject(cwd: string): string {
  // Use the last component of the path as the project name
  return path.basename(cwd) || "unknown";
}

export async function parseSessions(
  claudeDir: string,
  since?: Date,
): Promise<SessionEntry[]> {
  const results: SessionEntry[] = [];

  try {
    const sessionFiles = await glob(
      path.join(claudeDir, "sessions", "*.json"),
    );

    for (const file of sessionFiles) {
      try {
        const raw = fs.readFileSync(file, "utf-8");
        const data = JSON.parse(raw);

        // Handle both single object and array formats
        const entries = Array.isArray(data) ? data : [data];

        for (const entry of entries) {
          const sessionId = entry.sessionId ?? entry.session_id ?? null;
          const cwd = entry.cwd ?? entry.workingDirectory ?? null;
          const startTimestamp =
            entry.startTimestamp ??
            entry.start_timestamp ??
            entry.startedAt ??
            entry.started_at ??
            null;
          const sessionKind = entry.kind ?? entry.sessionKind ?? "interactive";

          if (!sessionId) continue;

          // Filter by timestamp if since is provided
          if (since && startTimestamp) {
            const entryDate = new Date(startTimestamp);
            if (entryDate <= since) continue;
          }

          const project = cwd ? extractProject(cwd) : "unknown";
          const branch = cwd ? getBranch(cwd) : null;

          const startedAt = startTimestamp
            ? new Date(
                typeof startTimestamp === "number"
                  ? startTimestamp
                  : startTimestamp,
              ).toISOString()
            : new Date().toISOString();

          results.push({
            sessionId: String(sessionId),
            project,
            branch,
            startedAt,
            endedAt: null,
            sessionKind: String(sessionKind),
          });
        }
      } catch {
        // Skip files that can't be parsed
        continue;
      }
    }
  } catch {
    // If glob fails or directory doesn't exist, return empty
  }

  return results;
}
