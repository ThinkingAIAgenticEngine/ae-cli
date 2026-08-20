#!/usr/bin/env node

/**
 * verify-agent-tools.mjs
 *
 * Verify all commands registered under src/commands/te-agent/:
 * 1. Load registered command metadata
 * 2. Duplicate check
 * 3. Count check (EXPECTED_COUNT = 82)
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
const EXPECTED_COUNT = 82;
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

// ─── Step 5: Automation dry-run defaults ─────────────────────

try {
  const runDryRun = (extraArgs = [], env = process.env) => {
    const output = execFileSync(
      "npx",
      [
        "tsx",
        "src/index.ts",
        "--dry-run",
        SERVICE,
        "+create-automation",
        "--name",
        "Daily AI Brief",
        "--schedule-kind",
        "daily",
        "--time",
        "09:00",
        "--message",
        "Summarize yesterday's AI news",
        ...extraArgs,
      ],
      { encoding: "utf8", timeout: 30000, env },
    );
    return JSON.parse(output).data;
  };

  const defaultDryRun = runDryRun();
  if (defaultDryRun?.body?.status !== "active") {
    fail(`+create-automation default status should be active, got ${defaultDryRun?.body?.status}`);
  } else {
    ok("+create-automation dry-run defaults to active status");
  }
  const chatContextEnv = {
    ...process.env,
    TE_AGENT_CONVERSATION_ID: "conversation-from-chat",
    TE_AGENT_CURRENT_AGENT_ID: "agent-from-chat",
    TE_AGENT_CURRENT_MODEL_ID: "model-from-chat",
  };
  const chatContextDryRun = runDryRun([], chatContextEnv);
  if (
    chatContextDryRun?.body?.conversationId !== "conversation-from-chat" ||
    chatContextDryRun?.body?.agentId !== "agent-from-chat" ||
    chatContextDryRun?.body?.model !== "model-from-chat"
  ) {
    fail(
      `+create-automation did not use chat context environment defaults: ${JSON.stringify(chatContextDryRun?.body)}`,
    );
  } else {
    ok("+create-automation uses chat context environment defaults");
  }

  const explicitContextDryRun = runDryRun(
    [
      "--conversation-id",
      "conversation-explicit",
      "--agent-id",
      "agent-explicit",
      "--model",
      "model-explicit",
    ],
    chatContextEnv,
  );
  if (
    explicitContextDryRun?.body?.conversationId !== "conversation-explicit" ||
    explicitContextDryRun?.body?.agentId !== "agent-explicit" ||
    explicitContextDryRun?.body?.model !== "model-explicit"
  ) {
    fail(
      `+create-automation explicit context flags did not override environment defaults: ${JSON.stringify(explicitContextDryRun?.body)}`,
    );
  } else {
    ok("+create-automation explicit context flags override environment defaults");
  }

  if (defaultDryRun?.body?.reuseConversation !== false) {
    fail(
      `+create-automation should default reuseConversation to false, got ${defaultDryRun?.body?.reuseConversation}`,
    );
  } else {
    ok("+create-automation dry-run defaults to a new conversation per run");
  }

  const continuousDryRun = runDryRun(["--reuse-conversation", "true"]);
  if (continuousDryRun?.body?.reuseConversation !== true) {
    fail(
      `+create-automation --reuse-conversation true was not mapped: ${continuousDryRun?.body?.reuseConversation}`,
    );
  } else {
    ok("+create-automation dry-run maps continuous conversation mode");
  }

  try {
    runDryRun(["--reuse-conversation", "invalid"]);
    fail("+create-automation should reject an invalid --reuse-conversation value");
  } catch {
    ok("+create-automation rejects an invalid continuous conversation value");
  }

  const pausedDryRun = runDryRun(["--enabled", "false"]);
  if (pausedDryRun?.body?.status !== "paused") {
    fail(`+create-automation --enabled false status should be paused, got ${pausedDryRun?.body?.status}`);
  } else {
    ok("+create-automation dry-run maps --enabled false to paused status");
  }

  const listOutput = execFileSync(
    "npx",
    [
      "tsx",
      "src/index.ts",
      "--dry-run",
      SERVICE,
      "+list-automations",
      "--q",
      "Daily",
      "--status",
      "active",
      "--limit",
      "5",
    ],
    { encoding: "utf8", timeout: 30000 },
  );
  const listDryRun = JSON.parse(listOutput).data;
  if (listDryRun?.method !== "GET" || !String(listDryRun?.url).includes("q=Daily") || !String(listDryRun?.url).includes("status=active") || !String(listDryRun?.url).includes("limit=5")) {
    fail(`+list-automations dry-run URL is incorrect: ${listDryRun?.url}`);
  } else {
    ok("+list-automations dry-run builds query URL");
  }

  const updateOutput = execFileSync(
    "npx",
    [
      "tsx",
      "src/index.ts",
      "--dry-run",
      SERVICE,
      "+update-automation",
      "--id",
      "automation-1",
      "--enabled",
      "false",
      "--schedule-kind",
      "daily",
      "--time",
      "08:30",
      "--name",
      "Daily AI Brief",
      "--message",
      "Summarize AI product and model updates",
      "--reuse-conversation",
      "true",
    ],
    { encoding: "utf8", timeout: 30000 },
  );
  const updateDryRun = JSON.parse(updateOutput).data;
  if (
    updateDryRun?.method !== "PATCH" ||
    updateDryRun?.body?.status !== "paused" ||
    updateDryRun?.body?.schedule?.time !== "08:30" ||
    updateDryRun?.body?.reuseConversation !== true
  ) {
    fail(
      `+update-automation dry-run body is incorrect: ${JSON.stringify(updateDryRun?.body)}`,
    );
  } else {
    ok("+update-automation dry-run maps update fields");
  }

  try {
    execFileSync(
      "npx",
      ["tsx", "src/index.ts", "--dry-run", SERVICE, "+update-automation", "--id", "automation-1"],
      { encoding: "utf8", timeout: 30000, stdio: "pipe" },
    );
    fail("+update-automation without update fields should fail");
  } catch {
    ok("+update-automation rejects empty updates");
  }
} catch (err) {
  fail(`Failed to verify automation dry-run behavior: ${err.message}`);
}

// ─── Step 6: Market / approval / share dry-run ──────────────

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
