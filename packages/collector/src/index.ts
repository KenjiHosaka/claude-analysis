#!/usr/bin/env node
import { program } from "commander";
import { initCommand } from "./commands/init.js";
import { syncCommand } from "./commands/sync.js";

program.name("claude-analysis-collector").version("0.0.1");

program
  .command("init")
  .description("Configure collector settings")
  .action(initCommand);

program
  .command("sync")
  .description("Sync Claude Code usage data to dashboard")
  .action(syncCommand);

program.parse();
