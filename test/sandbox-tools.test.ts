import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { scanSandboxTools } from "../src/commands/te-agent/sandbox-tools.js";

const root = mkdtempSync(join(tmpdir(), "ae-cli-sandbox-tools-"));
const binDir = join(root, "bin");
const toolsRoot = join(root, "share", "tools");
mkdirSync(binDir, { recursive: true });
mkdirSync(toolsRoot, { recursive: true });

function createTarget(relativePath: string, mode: number): string {
  const target = join(toolsRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, "tool", { mode });
  chmodSync(target, mode);
  return target;
}

function createShim(input: {
  command: string;
  target: string;
  runtime?: "node" | "native";
  tool?: string;
  version?: string;
  extra?: string;
}) {
  const lines = [
    "#!/usr/bin/env bash",
    "# managed-by: te-agent-sandbox-tools",
    `# tool: ${input.tool ?? "demo-tool"}`,
    `# version: ${input.version ?? "1.0.0"}`,
    `# command: ${input.command}`,
    `# target: ${input.target}`,
    ...(input.runtime ? [`# runtime: ${input.runtime}`] : []),
    ...(input.extra ? [input.extra] : []),
    "exit 0",
  ];
  writeFileSync(join(binDir, input.command), lines.join("\n"), { mode: 0o755 });
}

try {
  const nodeTarget = createTarget("demo-tool/1.0.0/bin/node-tool.js", 0o644);
  const nativeTarget = createTarget("native-tool/1.0.0/bin/native-tool", 0o755);
  const nonExecutable = createTarget(
    "broken-tool/1.0.0/bin/broken-tool",
    0o644,
  );
  createShim({ command: "node-tool", target: nodeTarget, runtime: "node" });
  createShim({
    command: "native-tool",
    target: nativeTarget,
    runtime: "native",
    tool: "native-tool",
  });
  createShim({
    command: "broken-tool",
    target: nonExecutable,
    runtime: "native",
    tool: "broken-tool",
  });
  createShim({
    command: "missing-tool",
    target: join(toolsRoot, "missing", "bin", "missing-tool"),
    runtime: "native",
    tool: "missing-tool",
  });

  const outsideTarget = join(root, "outside-tool");
  writeFileSync(outsideTarget, "outside", { mode: 0o755 });
  const escapedLink = join(
    toolsRoot,
    "escaped-tool",
    "1.0.0",
    "bin",
    "escaped-tool",
  );
  mkdirSync(dirname(escapedLink), { recursive: true });
  symlinkSync(outsideTarget, escapedLink);
  createShim({
    command: "escaped-tool",
    target: escapedLink,
    runtime: "native",
    tool: "escaped-tool",
  });

  createShim({
    command: "legacy-tool",
    target: nodeTarget,
    tool: "legacy-tool",
    version: "",
  });

  writeFileSync(join(binDir, "unmanaged"), "#!/bin/sh\nexit 0", {
    mode: 0o755,
  });
  writeFileSync(
    join(binDir, "oversized-unmanaged"),
    `#!/bin/sh\n# ${"x".repeat(17 * 1024)}\nexit 0`,
    { mode: 0o755 },
  );
  symlinkSync(join(binDir, "node-tool"), join(binDir, "shim-link"));
  writeFileSync(
    join(binDir, "oversized-tool"),
    [
      "#!/bin/sh",
      "# managed-by: te-agent-sandbox-tools",
      "# tool: oversized-tool",
      "# command: oversized-tool",
      `# target: ${nodeTarget}`,
      `# padding: ${"x".repeat(17 * 1024)}`,
    ].join("\n"),
    { mode: 0o755 },
  );

  const result = scanSandboxTools({ binDir, toolsRoot });
  assert.equal(result.summary.total, 7);
  assert.equal(result.summary.active, 3);
  assert.equal(result.summary.broken, 4);
  assert.equal(
    result.tools.find((entry) => entry.command === "node-tool")?.status,
    "active",
  );
  assert.equal(
    result.tools.find((entry) => entry.command === "node-tool")?.runtime,
    "node",
  );
  assert.equal(
    result.tools.find((entry) => entry.command === "native-tool")?.status,
    "active",
  );
  assert.equal(
    result.tools.find((entry) => entry.command === "broken-tool")?.reason,
    "target not executable",
  );
  assert.equal(
    result.tools.find((entry) => entry.command === "escaped-tool")?.reason,
    "target outside tools root",
  );
  assert.equal(
    result.tools.find((entry) => entry.command === "legacy-tool")?.runtime,
    "unknown",
  );
  assert.equal(
    result.tools.find((entry) => entry.command === "legacy-tool")?.version,
    "unknown",
  );
  assert.equal(
    result.tools.some((entry) => entry.command === "shim-link"),
    false,
  );
  assert.equal(
    result.tools.some((entry) => entry.command === "unmanaged"),
    false,
  );
  assert.equal(
    result.tools.some((entry) => entry.command === "oversized-unmanaged"),
    false,
  );
  assert.equal(
    result.tools.find((entry) => entry.command === "oversized-tool")?.reason,
    "shim exceeds size limit",
  );

  const brokenOnly = scanSandboxTools({ binDir, toolsRoot, status: "broken" });
  assert.equal(brokenOnly.tools.length, 4);
  assert.deepEqual(brokenOnly.summary, result.summary);

  const linkedToolsRoot = join(root, "tools-link");
  symlinkSync(toolsRoot, linkedToolsRoot, "dir");
  const linkedRootResult = scanSandboxTools({
    binDir,
    toolsRoot: linkedToolsRoot,
  });
  assert.equal(
    linkedRootResult.tools.find((entry) => entry.command === "node-tool")
      ?.status,
    "active",
  );
  assert.equal(
    linkedRootResult.tools.find((entry) => entry.command === "escaped-tool")
      ?.reason,
    "target outside tools root",
  );

  const forged = join(binDir, "forged-tool");
  writeFileSync(
    forged,
    [
      "#!/bin/sh",
      "# managed-by: te-agent-sandbox-tools",
      "# tool: forged-tool",
      "# command: forged-tool",
      `# target: ${nodeTarget}`,
      "# runtime: node",
      "# runtime: native",
    ].join("\n"),
    { mode: 0o755 },
  );
  const forgedResult = scanSandboxTools({ binDir, toolsRoot });
  assert.equal(
    forgedResult.tools.find((entry) => entry.command === "forged-tool")?.reason,
    "duplicate runtime marker",
  );

  console.log("sandbox-tools functional tests passed");
} finally {
  rmSync(root, { recursive: true, force: true });
}
