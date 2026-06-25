#!/usr/bin/env node

/**
 * verify-agent-tools.mjs
 *
 * Verify all commands under src/commands/te-agent/:
 * 1. Scan .ts files and extract command names via regex
 * 2. Duplicate check
 * 3. Count check (EXPECTED_COUNT = 19)
 * 4. Run ae-cli agent --help and verify all command names appear
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync, execSync } from "node:child_process";

const AGENT_DIR = "src/commands/te-agent";
const EXPECTED_COUNT = 19;
const SERVICE = "agent";

let failed = false;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

// ─── Step 1: Scan command files ──────────────────────────────

function scanCommands(dir) {
  const commands = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      commands.push(...scanCommands(full));
      continue;
    }
    if (!entry.endsWith(".ts") || entry === "index.ts") continue;

    const content = readFileSync(full, "utf8");
    const re = /command:\s*['"](\+[a-z][a-z0-9-]*)['"]/g;
    let match;
    while ((match = re.exec(content)) !== null) {
      commands.push({ name: match[1], file: full });
    }
  }
  return commands;
}

const commands = scanCommands(AGENT_DIR);
ok(`Found ${commands.length} commands`);

// ─── Step 2: Duplicate check ─────────────────────────────────

const names = commands.map((c) => c.name);
const uniqueNames = new Set(names);
if (uniqueNames.size !== names.length) {
  const seen = new Set();
  for (const n of names) {
    if (seen.has(n)) fail(`Duplicate command name: ${n}`);
    seen.add(n);
  }
} else {
  ok("No duplicate command names");
}

// ─── Step 3: Count check ─────────────────────────────────────

if (uniqueNames.size !== EXPECTED_COUNT) {
  fail(`Expected ${EXPECTED_COUNT} commands, found ${uniqueNames.size}`);
} else {
  ok(`Command count ${uniqueNames.size} = ${EXPECTED_COUNT}`);
}

// ─── Step 4: --help output verification ──────────────────────

try {
  const helpOutput = execSync(`npx tsx src/index.ts ${SERVICE} --help`, {
    encoding: "utf8",
    timeout: 30000,
  });

  let allFound = true;
  for (const name of uniqueNames) {
    if (!helpOutput.includes(name)) {
      fail(`Command missing from --help output: ${name}`);
      allFound = false;
    }
  }
  if (allFound) {
    ok(`--help output contains all ${uniqueNames.size} commands`);
  }
} catch (err) {
  fail(`Failed to run --help: ${err.message}`);
}

// ─── Step 5: Automation dry-run defaults ─────────────────────

try {
  const runDryRun = (extraArgs = []) => {
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
      { encoding: "utf8", timeout: 30000 },
    );
    return JSON.parse(output).data;
  };

  const defaultDryRun = runDryRun();
  if (defaultDryRun?.body?.status !== "active") {
    fail(`+create-automation default status should be active, got ${defaultDryRun?.body?.status}`);
  } else {
    ok("+create-automation dry-run defaults to active status");
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
    ],
    { encoding: "utf8", timeout: 30000 },
  );
  const updateDryRun = JSON.parse(updateOutput).data;
  if (updateDryRun?.method !== "PATCH" || updateDryRun?.body?.status !== "paused" || updateDryRun?.body?.schedule?.time !== "08:30") {
    fail(`+update-automation dry-run body is incorrect: ${JSON.stringify(updateDryRun?.body)}`);
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

// ─── Summary ─────────────────────────────────────────────────

if (failed) {
  console.error("\n✗ Verification failed");
  process.exit(1);
} else {
  console.log(`\n✓ All checks passed (${uniqueNames.size} commands)`);
}
