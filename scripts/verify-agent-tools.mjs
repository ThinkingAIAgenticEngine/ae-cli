#!/usr/bin/env node

/**
 * verify-agent-tools.mjs
 *
 * Verify all commands registered under src/commands/te-agent/:
 * 1. Load registered command metadata
 * 2. Duplicate check
 * 3. Count check (EXPECTED_COUNT = 100)
 * 4. Verify every flat or hierarchical command appears in the Commander tree
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Command as CommanderCommand } from "commander";

import registeredCommands from "../src/commands/te-agent/index.ts";
import { registerCommands } from "../src/framework/register.ts";
import {
  assertCommandRegistryMatches,
  commandPath,
  discoverCommandExports,
  duplicateCommandPaths,
  findCommanderCommand,
} from "./agent-command-registry.mjs";

const AGENT_DIR = "src/commands/te-agent";
const EXPECTED_COUNT = 100;
const SERVICE = "agent";

let failed = false;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

// ─── Step 1: Load registered commands ────────────────────────

const declaredEntries = await discoverCommandExports(AGENT_DIR);
const declaredCommands = declaredEntries.map((entry) => entry.command);
const commands = registeredCommands.map((command) => ({
  command,
  name: commandPath(command),
}));
ok(`Found ${declaredCommands.length} exported commands and ${commands.length} registered commands`);

try {
  assertCommandRegistryMatches(declaredCommands, registeredCommands);
  ok("Every exported command is registered exactly once");
} catch (err) {
  for (const message of err.message.split("\n")) fail(message);
}

const skillContentSource = readFileSync(join(AGENT_DIR, 'skill-content.ts'), 'utf8');
if (!/function makeAssetDelCommand[\s\S]*?risk: 'high-risk-write'/.test(skillContentSource)) {
  fail('Skill asset/reference/script delete commands must be high-risk-write');
} else {
  ok('Skill content delete commands use high-risk-write');
}
if (!/function makeAssetUploadCommand[\s\S]*?risk: 'write'/.test(skillContentSource)) {
  fail('Skill asset/reference/script upload commands must remain ordinary write');
} else {
  ok('Skill content upload commands remain ordinary write');
}

// ─── Step 2: Duplicate check ─────────────────────────────────

const names = commands.map((item) => item.name);
const uniqueNames = new Set(names);
const duplicateNames = duplicateCommandPaths(registeredCommands);
const duplicateDeclarations = duplicateCommandPaths(declaredCommands);
if (duplicateNames.length > 0 || duplicateDeclarations.length > 0) {
  for (const name of duplicateNames) fail(`Duplicate command path: ${name}`);
  for (const name of duplicateDeclarations) fail(`Duplicate exported command path: ${name}`);
} else {
  ok("No duplicate command paths");
}

// ─── Step 3: Count check ─────────────────────────────────────

if (uniqueNames.size !== EXPECTED_COUNT) {
  fail(`Expected ${EXPECTED_COUNT} commands, found ${uniqueNames.size}`);
} else {
  ok(`Command count ${uniqueNames.size} = ${EXPECTED_COUNT}`);
}
if (declaredCommands.length !== EXPECTED_COUNT) {
  fail(`Expected ${EXPECTED_COUNT} exported commands, found ${declaredCommands.length}`);
}

// ─── Step 4: Commander tree verification ─────────────────────

const program = new CommanderCommand().name("ae-cli");
registerCommands(program, registeredCommands);
let allFound = true;
for (const { command, name } of commands) {
  const registered = findCommanderCommand(program, command);
  if (!registered || !registered.helpInformation().includes(`Usage: ae-cli ${name}`)) {
    fail(`Command missing from registered help tree: ${name}`);
    allFound = false;
  }
}
if (allFound) {
  ok(`Registered help tree contains all ${uniqueNames.size} commands`);
}

// ─── Step 5: Market / approval / share dry-run ──────────────

try {
  const runDry = (cmd, args) => {
    const output = execFileSync(
      "npx",
      ["tsx", "src/index.ts", "--dry-run", SERVICE, cmd, ...args],
      { encoding: "utf8", timeout: 30000 },
    );
    return JSON.parse(output).data;
  };

  const marketDry = runDry("+list-mcp-market", ["--category", "dev_tool", "--sort", "calls", "--scope", "company"]);
  if (marketDry?.method !== "GET" || !String(marketDry?.url).includes("category=dev_tool") || !String(marketDry?.url).includes("sort=calls") || !String(marketDry?.url).includes("scope=company")) {
    fail(`+list-mcp-market dry-run URL is incorrect: ${marketDry?.url}`);
  } else {
    ok("+list-mcp-market dry-run builds market query");
  }

  const submitDry = runDry("+submit-skill", ["--id", "s1", "--description", "review helper", "--category", "dev_tool"]);
  if (submitDry?.method !== "POST" || !String(submitDry?.url).includes("/api/sandbox/agent/skills/s1/submit") || submitDry?.body?.description !== "review helper" || submitDry?.body?.category !== "dev_tool") {
    fail(`+submit-skill dry-run is incorrect: ${JSON.stringify(submitDry)}`);
  } else {
    ok("+submit-skill dry-run builds submit body");
  }

  const shareDry = runDry("+share-skill", ["--id", "s1", "--to-user-id", "u2"]);
  if (shareDry?.method !== "POST" || !String(shareDry?.url).includes("/api/sandbox/agent/skills/s1/share") || shareDry?.body?.toUserId !== "u2") {
    fail(`+share-skill dry-run is incorrect: ${JSON.stringify(shareDry)}`);
  } else {
    ok("+share-skill dry-run builds share body");
  }

  const approveDry = runDry("+approve-skill", ["--id", "sub1"]);
  if (approveDry?.method !== "POST" || !String(approveDry?.url).includes("/api/sandbox/agent/skills/submissions/sub1/approve")) {
    fail(`+approve-skill dry-run is incorrect: ${JSON.stringify(approveDry)}`);
  } else {
    ok("+approve-skill dry-run builds approve URL");
  }

  const copyDry = runDry("+copy-skill", ["--id", "s1", "--category", "dev_tool"]);
  if (copyDry?.method !== "POST" || !String(copyDry?.url).includes("/api/sandbox/agent/skills/s1/copy") || copyDry?.body?.category !== "dev_tool") {
    fail(`+copy-skill dry-run is incorrect: ${JSON.stringify(copyDry)}`);
  } else {
    ok("+copy-skill dry-run builds copy URL and body");
  }
} catch (err) {
  fail(`Failed to verify market/approval/share dry-run: ${err.message}`);
}

// ─── Summary ─────────────────────────────────────────────────

if (failed) {
  console.error("\n✗ Verification failed");
  process.exit(1);
} else {
  console.log(`\n✓ All checks passed (${uniqueNames.size} commands)`);
}
