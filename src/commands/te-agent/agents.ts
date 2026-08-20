/**
 * ae-cli agent Agent 管理命令
 *
 * +list-agents   — 列出当前用户可见 Agent
 * +create-agent  — 创建 Agent（personal scope 默认；company 需 root）
 * +update-agent  — 更新 Agent（名称/描述/指令/模型/MCP/Skill/enabled）
 * +del-agent     — 软删 Agent
 * +get-agent     — 查询 Agent 详情
 */

import type { Command } from "../../framework/types.js";
import {
  deleteAgentApi,
  getAgentApi,
  patchAgentApi,
  postAgentApi,
} from "./api-client.js";

const BASE_PATH = "/api/sandbox/agent/agents";

function buildQuery(
  ctx: Parameters<NonNullable<Command["dryRun"]>>[0],
): string {
  const params = new URLSearchParams();
  const scope = ctx.str("scope");
  const q = ctx.str("q");
  if (scope) params.set("scope", scope);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const listAgents: Command = {
  service: "agent",
  command: "+list-agents",
  description: "List Agents visible to current user",
  flags: [
    {
      name: "scope",
      type: "string",
      required: false,
      desc: "Filter by scope: personal | company | system",
    },
    {
      name: "q",
      type: "string",
      required: false,
      desc: "Search by Agent name or description",
    },
  ],
  risk: "read",
  validate: (ctx) => {
    const scope = ctx.str("scope");
    if (scope && !["personal", "company", "system"].includes(scope)) {
      throw new Error("--scope 必须是 personal、company 或 system");
    }
  },
  dryRun: (ctx) => ({ method: "GET", url: `${BASE_PATH}${buildQuery(ctx)}` }),
  execute: async (ctx) => getAgentApi(ctx, `${BASE_PATH}${buildQuery(ctx)}`),
};

/**
 * Resolve the instructions argument: supports @- to read from stdin
 */
async function resolveInstructions(raw: string): Promise<string> {
  if (raw === "@-") {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const text = Buffer.concat(chunks).toString("utf8").trim();
    if (!text) throw new Error("stdin is empty; cannot read instructions");
    return text;
  }
  return raw;
}

export const createAgent: Command = {
  service: "agent",
  command: "+create-agent",
  description: "Create an Agent (personal scope by default; company requires root/agent_admin)",
  flags: [
    { name: "name", type: "string", required: true, desc: "Agent name (1-100 chars)" },
    { name: "description", type: "string", required: false, desc: "Agent description (max 2000 chars)" },
    { name: "instructions", type: "string", required: false, desc: "Agent system prompt (use @- to read from stdin)" },
    { name: "scope", type: "string", required: false, default: "personal", desc: "Scope: personal | company (company requires root/agent_admin)" },
    { name: "model-id", type: "string", required: false, desc: "Model identifier (Model.id uuid or legacy modelId); omit to use global default" },
    { name: "mcp-ids", type: "json", required: false, desc: 'MCP server record IDs as JSON array string (e.g. ["id1","id2"])' },
    { name: "skill-ids", type: "json", required: false, desc: "Skill record IDs as JSON array string" },
    { name: "auto-rename", type: "boolean", required: false, desc: "Auto-rename on name conflict (append -N suffix)" },
  ],
  risk: "write",
  validate: (ctx) => {
    const name = ctx.str("name");
    if (!name || name.length < 1 || name.length > 100) {
      throw new Error("--name length must be between 1 and 100");
    }
    const scope = ctx.str("scope");
    if (scope && !["personal", "company"].includes(scope)) {
      throw new Error("--scope must be personal or company");
    }
  },
  dryRun: (ctx) => {
    const body: Record<string, unknown> = {
      name: ctx.str("name"),
      scope: ctx.str("scope") || "personal",
    };
    const description = ctx.str("description");
    if (description) body.description = description;
    const instructions = ctx.str("instructions");
    if (instructions) body.systemPrompt = instructions === "@-" ? "(from stdin)" : instructions;
    const modelId = ctx.str("modelId");
    if (modelId) body.model = modelId;
    const mcpIds = ctx.json("mcpIds");
    if (mcpIds) body.mcpServerIds = mcpIds;
    const skillIds = ctx.json("skillIds");
    if (skillIds) body.skillIds = skillIds;
    if (ctx.bool("autoRename")) body.autoRename = true;
    return { method: "POST", url: BASE_PATH, body };
  },
  execute: async (ctx) => {
    const body: Record<string, unknown> = {
      name: ctx.str("name"),
      scope: ctx.str("scope") || "personal",
    };
    const description = ctx.str("description");
    if (description) body.description = description;
    const instructionsRaw = ctx.str("instructions");
    if (instructionsRaw) body.systemPrompt = await resolveInstructions(instructionsRaw);
    const modelId = ctx.str("modelId");
    if (modelId) body.model = modelId;
    const mcpIds = ctx.json("mcpIds");
    if (mcpIds) body.mcpServerIds = mcpIds;
    const skillIds = ctx.json("skillIds");
    if (skillIds) body.skillIds = skillIds;
    if (ctx.bool("autoRename")) body.autoRename = true;
    return postAgentApi(ctx, BASE_PATH, body);
  },
};

export const updateAgent: Command = {
  service: "agent",
  command: "+update-agent",
  description: "Update an Agent (name/description/instructions/model/MCP/Skill/enabled)",
  flags: [
    { name: "id", type: "string", required: true, desc: "Agent record ID (CUID)" },
    { name: "name", type: "string", required: false, desc: "New Agent name (1-100 chars)" },
    { name: "description", type: "string", required: false, desc: "New description (max 2000 chars)" },
    { name: "instructions", type: "string", required: false, desc: "New system prompt (use @- to read from stdin)" },
    { name: "model-id", type: "string", required: false, desc: "New model identifier (uuid or legacy modelId); omit to keep" },
    { name: "mcp-ids", type: "json", required: false, desc: "MCP server record IDs as JSON array string (replaces the list; [] clears)" },
    { name: "skill-ids", type: "json", required: false, desc: "Skill record IDs as JSON array string (replaces the list; [] clears)" },
    { name: "enabled", type: "boolean", required: false, desc: "Enable/disable (system/company: writes personal preference)" },
  ],
  risk: "write",
  validate: (ctx) => {
    const name = ctx.str("name");
    if (name && (name.length < 1 || name.length > 100)) {
      throw new Error("--name length must be between 1 and 100");
    }
  },
  dryRun: (ctx) => {
    const body: Record<string, unknown> = {};
    const name = ctx.str("name");
    if (name) body.name = name;
    const description = ctx.str("description");
    if (description) body.description = description;
    const instructions = ctx.str("instructions");
    if (instructions) body.systemPrompt = instructions === "@-" ? "(from stdin)" : instructions;
    const modelId = ctx.str("modelId");
    if (modelId) body.model = modelId;
    const mcpIds = ctx.json("mcpIds");
    if (mcpIds) body.mcpServerIds = mcpIds;
    const skillIds = ctx.json("skillIds");
    if (skillIds) body.skillIds = skillIds;
    // Boolean --enabled: distinguish "not provided" (omit) from explicit true/false
    if (ctx.str("enabled")) body.enabled = ctx.bool("enabled");
    return { method: "PATCH", url: `${BASE_PATH}/${encodeURIComponent(ctx.str("id"))}`, body };
  },
  execute: async (ctx) => {
    const body: Record<string, unknown> = {};
    const name = ctx.str("name");
    if (name) body.name = name;
    const description = ctx.str("description");
    if (description) body.description = description;
    const instructionsRaw = ctx.str("instructions");
    if (instructionsRaw) body.systemPrompt = await resolveInstructions(instructionsRaw);
    const modelId = ctx.str("modelId");
    if (modelId) body.model = modelId;
    const mcpIds = ctx.json("mcpIds");
    if (mcpIds) body.mcpServerIds = mcpIds;
    const skillIds = ctx.json("skillIds");
    if (skillIds) body.skillIds = skillIds;
    // Boolean --enabled: distinguish "not provided" (omit) from explicit true/false
    if (ctx.str("enabled")) body.enabled = ctx.bool("enabled");
    return patchAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str("id"))}`, body);
  },
};

export const delAgent: Command = {
  service: "agent",
  command: "+del-agent",
  description: "Soft-delete an Agent (system agents cannot be deleted)",
  flags: [
    { name: "id", type: "string", required: true, desc: "Agent record ID (CUID)" },
  ],
  risk: "high-risk-write",
  dryRun: (ctx) => ({
    method: "DELETE",
    url: `${BASE_PATH}/${encodeURIComponent(ctx.str("id"))}`,
  }),
  execute: async (ctx) => {
    return deleteAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str("id"))}`);
  },
};

export const getAgent: Command = {
  service: "agent",
  command: "+get-agent",
  description: "Get Agent details by ID",
  flags: [
    { name: "id", type: "string", required: true, desc: "Agent record ID (CUID)" },
  ],
  risk: "read",
  dryRun: (ctx) => ({
    method: "GET",
    url: `${BASE_PATH}/${encodeURIComponent(ctx.str("id"))}`,
  }),
  execute: async (ctx) => {
    return getAgentApi(ctx, `${BASE_PATH}/${encodeURIComponent(ctx.str("id"))}`);
  },
};
