import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

const CONFIG_PATH = path.join(
  process.env.HOME ?? "~",
  ".claude-analysis.json",
);

type CollectorConfig = {
  serverUrl: string;
  apiKey: string;
  lastSyncAt: string | null;
};

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      resolve(answer.trim());
    });
  });
}

export async function initCommand(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("Claude Analysis Collector — Setup\n");

    const serverUrl = await prompt(
      rl,
      "Server URL (e.g. https://dashboard.example.com): ",
    );
    if (!serverUrl) {
      console.error("Error: Server URL is required.");
      process.exit(1);
    }

    const apiKey = await prompt(rl, "API Key: ");
    if (!apiKey) {
      console.error("Error: API Key is required.");
      process.exit(1);
    }

    const config: CollectorConfig = {
      serverUrl: serverUrl.replace(/\/+$/, ""),
      apiKey,
      lastSyncAt: null,
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", {
      encoding: "utf-8",
    });

    console.log(`\nConfig written to ${CONFIG_PATH}`);
    console.log("Run `claude-analysis-collector sync` to sync data.");
  } finally {
    rl.close();
  }
}
