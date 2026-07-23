/**
 * ae-cli agent sandbox-tools commands
 *
 * +list-sandbox-tools — list managed tools in the current sandbox and verify
 * their real targets, share-root containment, file type, and permissions.
 */

import {
  accessSync,
  closeSync,
  constants,
  existsSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { Command } from "../../framework/types.js";

const SANDBOX_BIN_DIR = "/home/ta/.local/bin";
const SANDBOX_SHARE_ROOT =
  process.env.SANDBOX_SYSTEM_SHARE_ROOT ?? "/data/app/te_agent_ta/share";
const SHIM_MARKER = "managed-by: te-agent-sandbox-tools";
const MAX_SHIM_BYTES = 16 * 1024;
const NAME_RE = /^[a-z][a-z0-9._-]{0,63}$/;

type SandboxToolRuntime = "node" | "native";
type ToolStatus = "active" | "broken";

interface ParsedShim {
  managed: boolean;
  tool: string;
  version: string;
  command: string;
  target: string;
  runtime?: SandboxToolRuntime;
  reason?: string;
}

export interface SandboxToolEntry {
  tool: string;
  version: string;
  command: string;
  runtime: SandboxToolRuntime | "unknown";
  target: string;
  status: ToolStatus;
  reason?: string;
}

export interface ScanSandboxToolsOptions {
  binDir?: string;
  toolsRoot?: string;
  status?: ToolStatus;
}

function hasControlCharacters(value: string): boolean {
  return /[\x00-\x1f\x7f]/.test(value);
}

function readShimHeader(filePath: string, size: number): string {
  const buffer = Buffer.alloc(Math.min(size, MAX_SHIM_BYTES));
  const fd = openSync(filePath, "r");
  try {
    const bytesRead = readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.toString("utf8", 0, bytesRead);
  } finally {
    closeSync(fd);
  }
}

function parseShim(filePath: string): ParsedShim {
  const fallback: ParsedShim = {
    managed: false,
    tool: "",
    version: "unknown",
    command: "",
    target: "",
  };
  try {
    const stat = lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) return fallback;
    const lines = readShimHeader(filePath, stat.size).split("\n").slice(0, 10);
    const managed = lines.includes(`# ${SHIM_MARKER}`);
    if (!managed) return fallback;
    if (stat.size > MAX_SHIM_BYTES) {
      return { ...fallback, managed: true, reason: "shim exceeds size limit" };
    }
    const values = new Map<string, string>();
    for (const line of lines) {
      if (line === `# ${SHIM_MARKER}`) continue;
      const match = /^# (tool|version|command|target|runtime): (.*)$/.exec(
        line,
      );
      if (!match) continue;
      if (values.has(match[1])) {
        return { ...fallback, managed, reason: `duplicate ${match[1]} marker` };
      }
      values.set(match[1], match[2].trim());
    }
    const tool = values.get("tool") ?? "";
    const version = values.get("version") || "unknown";
    const command = values.get("command") ?? "";
    const target = values.get("target") ?? "";
    const runtimeValue = values.get("runtime");
    const runtime =
      runtimeValue === "node" || runtimeValue === "native"
        ? runtimeValue
        : undefined;
    if (!NAME_RE.test(tool) || !NAME_RE.test(command)) {
      return {
        ...fallback,
        managed: true,
        reason: "invalid tool or command marker",
      };
    }
    if (
      version.length > 64 ||
      hasControlCharacters(version) ||
      hasControlCharacters(target) ||
      !isAbsolute(target)
    ) {
      return {
        ...fallback,
        managed: true,
        tool,
        command,
        reason: "invalid version or target marker",
      };
    }
    if (runtimeValue && !runtime) {
      return {
        ...fallback,
        managed: true,
        tool,
        version,
        command,
        target,
        reason: "invalid runtime marker",
      };
    }
    return { managed: true, tool, version, command, target, runtime };
  } catch {
    return fallback;
  }
}

function isInsideOrEqual(candidate: string, root: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function classifyShim(
  parsed: ParsedShim,
  toolsRoot: string,
): { status: ToolStatus; reason?: string } {
  if (parsed.reason) return { status: "broken", reason: parsed.reason };
  if (!parsed.target)
    return { status: "broken", reason: "shim missing target marker" };
  let realRoot: string;
  try {
    realRoot = realpathSync(resolve(toolsRoot));
  } catch {
    return { status: "broken", reason: "tools root missing" };
  }
  let realTarget: string;
  try {
    realTarget = realpathSync(parsed.target);
  } catch {
    return { status: "broken", reason: "target missing" };
  }
  if (!isInsideOrEqual(realTarget, realRoot)) {
    return { status: "broken", reason: "target outside tools root" };
  }
  try {
    if (!lstatSync(realTarget).isFile()) {
      return { status: "broken", reason: "target not a file" };
    }
    accessSync(
      realTarget,
      parsed.runtime === "native" ? constants.X_OK : constants.R_OK,
    );
  } catch {
    return {
      status: "broken",
      reason:
        parsed.runtime === "native"
          ? "target not executable"
          : "target not readable",
    };
  }
  return { status: "active" };
}

export function scanSandboxTools(options: ScanSandboxToolsOptions = {}) {
  const binDir = options.binDir ?? SANDBOX_BIN_DIR;
  const toolsRoot = options.toolsRoot ?? join(SANDBOX_SHARE_ROOT, "tools");
  if (!existsSync(binDir)) {
    return { tools: [], summary: { total: 0, active: 0, broken: 0 } };
  }
  const all: SandboxToolEntry[] = [];
  for (const name of readdirSync(binDir).sort()) {
    const filePath = join(binDir, name);
    const parsed = parseShim(filePath);
    if (!parsed.managed) continue;
    const { status, reason } = classifyShim(parsed, toolsRoot);
    all.push({
      tool: parsed.tool || "unknown",
      version: parsed.version || "unknown",
      command: parsed.command || name,
      runtime: parsed.runtime ?? "unknown",
      target: parsed.target,
      status,
      reason,
    });
  }
  const active = all.filter((entry) => entry.status === "active").length;
  const broken = all.filter((entry) => entry.status === "broken").length;
  const tools = options.status
    ? all.filter((entry) => entry.status === options.status)
    : all;
  return { tools, summary: { total: all.length, active, broken } };
}

export const listSandboxTools: Command = {
  service: "agent",
  command: "+list-sandbox-tools",
  description:
    "List managed tools in the current sandbox and verify their targets and permissions",
  flags: [
    {
      name: "status",
      type: "string",
      required: false,
      desc: "Filter by status: active | broken",
    },
  ],
  risk: "read",
  validate: (ctx) => {
    const status = ctx.str("status");
    if (status && !["active", "broken"].includes(status)) {
      throw new Error("--status must be active or broken");
    }
  },
  dryRun: () => ({
    method: "LOCAL_SCAN",
    url: SANDBOX_BIN_DIR,
    body: { marker: SHIM_MARKER, toolsRoot: join(SANDBOX_SHARE_ROOT, "tools") },
  }),
  execute: async (ctx) =>
    scanSandboxTools({ status: ctx.str("status") as ToolStatus | undefined }),
};
