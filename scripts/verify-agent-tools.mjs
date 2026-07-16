#!/usr/bin/env node

/**
 * verify-agent-tools.mjs
 *
 * Verify all commands under src/commands/te-agent/:
 * 1. Scan .ts files and extract command names via regex
 * 2. Duplicate check
 * 3. Count check (EXPECTED_COUNT = 66)
 * 4. Run ae-cli agent --help and verify all command names appear
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { execFileSync, execSync } from "node:child_process";

const AGENT_DIR = "src/commands/te-agent";
const EXPECTED_COUNT = 66;
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
    const re = /['"](\+[a-z][a-z0-9-]*)['"]/g;
    let match;
    while ((match = re.exec(content)) !== null) {
      commands.push({ name: match[1], file: full });
    }
  }
  return commands;
}

const commands = scanCommands(AGENT_DIR);
ok(`Found ${commands.length} commands`);

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
