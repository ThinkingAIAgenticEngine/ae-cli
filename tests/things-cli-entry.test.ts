import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Exercise the real Commander registration and global output flags, without auth/network.
const output = execFileSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "src/index.ts",
    "--no-update-check",
    "--host",
    "http://127.0.0.1:1",
    "--format",
    "json",
    "--dry-run",
    "things",
    "create",
    "--agent-space-id",
    "fixture-space",
    "--title",
    "PRIVATE_DRY_RUN_BODY",
  ],
  { encoding: "utf8", timeout: 60000 },
);
const result = JSON.parse(output);
assert.equal(result.ok, true);
assert.equal(result.data.method, "POST");
assert.equal(result.data.body.payload, "[REDACTED]");
assert.ok(!output.includes("PRIVATE_DRY_RUN_BODY"));
const contextOutput = execFileSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "src/index.ts",
    "--no-update-check",
    "--host",
    "http://127.0.0.1:1",
    "--format",
    "json",
    "--dry-run",
    "things",
    "context",
    "--agent-space-id",
    "fixture-space",
    "--id",
    "fixture-thing",
    "--run-id",
    "fixture-run",
  ],
  { encoding: "utf8", timeout: 60000 },
);
const contextResult = JSON.parse(contextOutput);
assert.equal(contextResult.ok, true);
assert.equal(contextResult.data.method, "GET");
assert.match(contextResult.data.url, /things\/fixture-thing\/context$/);
assert.equal(contextResult.data.params.query, "[REDACTED]");
for (const file of [
  "skills/ae-things/SKILL.md",
  "skills/ae-things/references/cli.md",
  "skills/ae-things-review/SKILL.md",
  "skills/ae-things-progress/SKILL.md",
]) {
  assert.ok(
    !/--json\b/.test(readFileSync(file, "utf8")),
    `${file} must use --format json`,
  );
}
console.log(
  "PASS things actual CLI registration, JSON output, dry-run privacy and Skill flags",
);

const conversationHelp = execFileSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "src/index.ts",
    "--no-update-check",
    "things",
    "conversation",
    "--help",
  ],
  { encoding: "utf8" },
);
assert.ok(!/\bstart\b/.test(conversationHelp));
for (const name of ["get", "primary", "bind", "unbind"])
  assert.ok(conversationHelp.includes(name));
const removed = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "src/index.ts",
    "--no-update-check",
    "things",
    "conversation",
    "start",
  ],
  { encoding: "utf8" },
);
assert.notEqual(removed.status, 0);
assert.match(removed.stderr, /unknown command 'start'/);

for (const flags of [
  [
    "asset",
    "link",
    "--id",
    "thing",
    "--asset-id",
    "asset",
    "--role",
    "deliverable",
  ],
  [
    "asset",
    "publish",
    "--id",
    "thing",
    "--artifact-id",
    "artifact",
    "--role",
    "deliverable",
  ],
  [
    "from-message",
    "--title",
    "New",
    "--entry-type",
    "progress",
    "--conversation-id",
    "conversation",
    "--message-id",
    "message",
    "--content",
    "Description",
  ],
]) {
  for (const dryRun of [[], ["--dry-run"]]) {
    const invalid = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/index.ts",
        "--no-update-check",
        "--host",
        "http://127.0.0.1:1",
        "--format",
        "json",
        ...dryRun,
        "things",
        ...flags,
        "--agent-space-id",
        "fixture-space",
      ],
      { encoding: "utf8", timeout: 10000 },
    );
    assert.notEqual(invalid.status, 0);
    assert.match(
      invalid.stdout + invalid.stderr,
      /only accepts attachment|only supported with --id/,
    );
    assert.doesNotMatch(
      invalid.stdout + invalid.stderr,
      /ECONNREFUSED|fetch failed/,
    );
  }
}
