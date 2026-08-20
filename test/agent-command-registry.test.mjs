import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { Command as CommanderCommand } from "commander";

import {
  assertCommandRegistryMatches,
  commandPath,
  commandRegistryDifferences,
  discoverCommandExports,
  duplicateCommandPaths,
  findCommanderCommand,
} from "../scripts/agent-command-registry.mjs";

async function listTypeScriptFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listTypeScriptFiles(new URL(`${entry.name}/`, directory), relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(relativePath);
    }
  }
  return files;
}

test("commandPath includes the complete resource hierarchy", () => {
  assert.equal(
    commandPath({ service: "agent", resource: "approval-request history", command: "list" }),
    "agent approval-request history list",
  );
  assert.equal(commandPath({ service: "agent", command: "+list-skills" }), "agent +list-skills");
});

test("duplicate detection uses the full command path", () => {
  const commands = [
    { service: "agent", resource: "approval-request", command: "list" },
    { service: "agent", resource: "approval-task", command: "list" },
    { service: "agent", resource: "approval-request", command: "list" },
  ];

  assert.deepEqual(duplicateCommandPaths(commands), ["agent approval-request list"]);
});

test("discoverCommandExports finds command objects independently from the registry", async (t) => {
  const fixtureDir = await mkdtemp(join(tmpdir(), "agent-command-registry-"));
  t.after(() => rm(fixtureDir, { force: true, recursive: true }));
  const nestedDir = join(fixtureDir, "approval");
  await mkdir(nestedDir);
  await writeFile(
    join(nestedDir, "approval-request.mjs"),
    `export const list = { service: "agent", resource: "approval-request", command: "list", flags: [], execute: async () => ({}) };\n`,
  );
  await writeFile(join(fixtureDir, "helper.mjs"), `export const value = "not-a-command";\n`);
  await writeFile(
    join(fixtureDir, "index.mjs"),
    `export const ignored = { service: "agent", resource: "ignored", command: "list", flags: [], execute: async () => ({}) };\n`,
  );

  const discovered = await discoverCommandExports(fixtureDir);

  assert.deepEqual(discovered.map((entry) => commandPath(entry.command)), ["agent approval-request list"]);
});

test("registry comparison reports an exported command missing from index", () => {
  const declared = [{ service: "agent", resource: "approval-request", command: "list" }];
  assert.deepEqual(commandRegistryDifferences(declared, []), {
    missingRegistrations: ["agent approval-request list"],
    missingDeclarations: [],
  });
  assert.throws(
    () => assertCommandRegistryMatches(declared, []),
    /Command export missing from registry: agent approval-request list/,
  );
});

test("a missing registration makes the registry gate exit non-zero", () => {
  const helperUrl = new URL("../scripts/agent-command-registry.mjs", import.meta.url).href;
  const script = `import { assertCommandRegistryMatches } from ${JSON.stringify(helperUrl)}; assertCommandRegistryMatches([{ service: "agent", resource: "approval-request", command: "list" }], []);`;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Command export missing from registry: agent approval-request list/);
});

test("findCommanderCommand resolves nested commands and rejects missing registrations", () => {
  const program = new CommanderCommand().name("ae-cli");
  program.command("agent").command("approval-request").command("history").command("list");

  assert.equal(
    findCommanderCommand(program, {
      service: "agent",
      resource: "approval-request history",
      command: "list",
    })?.name(),
    "list",
  );
  assert.equal(
    findCommanderCommand(program, {
      service: "agent",
      resource: "approval-task",
      command: "list",
    }),
    undefined,
  );
});

test("agent commands use the domain API client so RuntimeContext host cannot be skipped", async () => {
  const commandDir = new URL("../src/commands/te-agent/", import.meta.url);
  const entries = await listTypeScriptFiles(commandDir);
  const directImports = [];

  for (const entry of entries) {
    if (!entry.endsWith(".ts") || entry === "api-client.ts") continue;
    const source = await readFile(new URL(entry, commandDir), "utf8");
    if (/from\s+["']\.\.\/\.\.\/core\/te-agent-client\.js["']/.test(source)) {
      directImports.push(entry);
    }
  }

  assert.deepEqual(
    directImports,
    [],
    `Agent commands must use api-client.ts instead of bypassing ctx.host(): ${directImports.join(", ")}`,
  );
});
