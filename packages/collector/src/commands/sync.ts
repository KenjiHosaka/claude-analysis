import * as fs from "node:fs";
import * as path from "node:path";
import type { CollectPayload } from "@claude-analysis/shared";
import { parseSessions } from "../parsers/sessions.js";
import { parseTokens } from "../parsers/tokens.js";
import { parseSkills } from "../parsers/skills.js";
import { parseSubagents } from "../parsers/subagents.js";
import { sendData } from "../client/api.js";

const CONFIG_PATH = path.join(
  process.env.HOME ?? "~",
  ".claude-analysis.json",
);

type CollectorConfig = {
  serverUrl: string;
  apiKey: string;
  lastSyncAt: string | null;
};

function readConfig(): CollectorConfig | never {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(
      `Error: Config file not found at ${CONFIG_PATH}\nRun \`claude-analysis-collector init\` first.`,
    );
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as CollectorConfig;
  } catch {
    console.error(`Error: Failed to parse config at ${CONFIG_PATH}`);
    process.exit(1);
  }
}

function writeConfig(config: CollectorConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", {
    encoding: "utf-8",
  });
}

export async function syncCommand(): Promise<void> {
  const config = readConfig();
  const claudeDir = path.join(process.env.HOME ?? "~", ".claude");

  if (!fs.existsSync(claudeDir)) {
    console.error(
      `Error: Claude directory not found at ${claudeDir}\nEnsure Claude Code has been used on this machine.`,
    );
    process.exit(1);
  }

  const since = config.lastSyncAt ? new Date(config.lastSyncAt) : undefined;

  console.log("Collecting Claude Code usage data...");
  if (since) {
    console.log(`  Filtering for activity since ${since.toISOString()}`);
  }

  // 1. Parse sessions
  const sessions = await parseSessions(claudeDir, since);
  console.log(`  Sessions found: ${sessions.length}`);

  if (sessions.length === 0) {
    console.log("No new sessions to sync.");
    return;
  }

  const sessionIds = sessions.map((s) => s.sessionId);

  // 2. Parse token usage, skills, and subagents in parallel
  const [tokenUsages, skillUsages, subagentUsages] = await Promise.all([
    parseTokens(claudeDir, sessionIds),
    parseSkills(claudeDir, sessionIds),
    parseSubagents(claudeDir, sessionIds),
  ]);

  console.log(`  Token usage entries: ${tokenUsages.length}`);
  console.log(`  Skill usages: ${skillUsages.length}`);
  console.log(`  Subagent usages: ${subagentUsages.length}`);

  // 3. Build payload
  const payload: CollectPayload = {
    sessions,
    tokenUsages,
    skillUsages,
    subagentUsages,
  };

  // 4. Send data
  console.log(`\nSending data to ${config.serverUrl}...`);
  const result = await sendData(config.serverUrl, config.apiKey, payload);

  if (!result.ok) {
    console.error(`Error: Failed to send data — ${result.error}`);
    process.exit(1);
  }

  // 5. Update lastSyncAt
  config.lastSyncAt = new Date().toISOString();
  writeConfig(config);

  console.log("\nSync complete!");
  console.log(`  Sessions synced: ${sessions.length}`);
  console.log(`  Token entries: ${tokenUsages.length}`);
  console.log(`  Skill invocations: ${skillUsages.length}`);
  console.log(`  Subagent entries: ${subagentUsages.length}`);
}
