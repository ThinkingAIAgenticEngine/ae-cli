/**
 * ae-cli agent model management commands
 *
 * +list-models   — list visible models
 * +add-model     — add a custom model (personal)
 * +update-model  — update a personal custom model (id determines the record)
 * +test-model    — test model connectivity (LLM only)
 * +del-model     — delete a personal model
 * +toggle-model  — enable/disable a model
 */

import type { Command } from "../../framework/types.js";
import {
  deleteAgentApi,
  getAgentApi,
  patchAgentApi,
  postAgentApi,
} from "./api-client.js";

const BASE_PATH = "/api/sandbox/agent/models";

export const listModels: Command = {
  service: "agent",
  command: "+list-models",
  description:
    "List models visible to current user (personal / company / system)",
  flags: [
    {
      name: "scope",
      type: "string",
      required: false,
      desc: "Filter by scope: personal | company | system",
    },
  ],
  risk: "read",
  validate: (ctx) => {
    const scope = ctx.str("scope");
    if (scope && !["personal", "company", "system"].includes(scope)) {
      throw new Error("--scope must be personal, company, or system");
    }
  },
  dryRun: (ctx) => {
    const scope = ctx.str("scope");
    const params = new URLSearchParams();
    if (scope) params.set("scope", scope);
    const qs = params.toString();
    return { method: "GET", url: `${BASE_PATH}${qs ? `?${qs}` : ""}` };
  },
  execute: async (ctx) => {
    const scope = ctx.str("scope");
    const params = new URLSearchParams();
    if (scope) params.set("scope", scope);
    const qs = params.toString();
    // /api/sandbox/agent/models 走 sandboxAgentAuth（Bearer/X-Sandbox 双通），
    // 返回 { items: [...] } 且不支持 current 参数；本地用 TE_AGENT_CURRENT_MODEL_ID
    // 计算 isCurrent，并保持 { models: [...] } 输出契约不变（对消费者透明）。
    const current = process.env.TE_AGENT_CURRENT_MODEL_ID?.trim();
    const data = await getAgentApi<{ items?: Array<{ id: string }> }>(
      ctx,
      `${BASE_PATH}${qs ? `?${qs}` : ""}`,
    );
    const items = (data?.items ?? []) as Record<string, unknown>[];
    return {
      models: items.map((m) => ({
        ...m,
        isCurrent: current ? m.id === current : false,
      })),
    };
  },
};

export const addModel: Command = {
  service: "agent",
  command: "+add-model",
  description: "Add a custom model (personal or company scope)",
  flags: [
    {
      name: "model-id",
      type: "string",
      required: true,
      desc: "Model identifier (e.g. gpt-4o)",
    },
    { name: "name", type: "string", required: true, desc: "Display name" },
    { name: "base-url", type: "string", required: true, desc: "API base URL" },
    { name: "api-key", type: "string", required: false, desc: "API key" },
    {
      name: "provider",
      type: "string",
      required: false,
      desc: "Provider name",
    },
    {
      name: "description",
      type: "string",
      required: false,
      desc: "Description",
    },
    {
      name: "context-length",
      type: "number",
      required: false,
      desc: "Context window length",
    },
    {
      name: "scope",
      type: "string",
      required: false,
      default: "personal",
      desc: "Target scope: personal | company",
    },
  ],
  risk: "write",
  validate: (ctx) => {
    const baseUrl = ctx.str("baseUrl");
    try {
      new URL(baseUrl);
    } catch {
      throw new Error("--base-url must be a valid URL");
    }
    const scope = ctx.str("scope");
    if (scope && !["personal", "company"].includes(scope)) {
      throw new Error("--scope must be personal or company");
    }
  },
  dryRun: (ctx) => ({
    method: "POST",
    url: BASE_PATH,
    body: {
      modelId: ctx.str("modelId"),
      displayName: ctx.str("name"),
      baseUrl: ctx.str("baseUrl"),
      apiKey: ctx.str("apiKey") || undefined,
      provider: ctx.str("provider") || undefined,
      description: ctx.str("description") || undefined,
      contextLength: ctx.num("contextLength") || undefined,
      scope: ctx.str("scope") || "personal",
    },
  }),
  execute: async (ctx) => {
    return postAgentApi(ctx, BASE_PATH, {
      modelId: ctx.str("modelId"),
      displayName: ctx.str("name"),
      baseUrl: ctx.str("baseUrl"),
      apiKey: ctx.str("apiKey") || undefined,
      provider: ctx.str("provider") || undefined,
      description: ctx.str("description") || undefined,
      contextLength: ctx.num("contextLength") || undefined,
      scope: ctx.str("scope") || "personal",
    });
  },
};

export const delModel: Command = {
  service: "agent",
  command: "+del-model",
  description: "Delete a model (personal or company scope)",
  flags: [
    {
      name: "id",
      type: "string",
      required: true,
      desc: "Model record ID (CUID)",
    },
    {
      name: "scope",
      type: "string",
      required: false,
      default: "personal",
      desc: "Target scope: personal | company",
    },
  ],
  risk: "high-risk-write",
  validate: (ctx) => {
    const scope = ctx.str("scope");
    if (scope && !["personal", "company"].includes(scope)) {
      throw new Error("--scope must be personal or company");
    }
  },
  dryRun: (ctx) => {
    const scope = ctx.str("scope") || "personal";
    const qs = `id=${encodeURIComponent(ctx.str("id"))}&scope=${encodeURIComponent(scope)}`;
    return { method: "DELETE", url: `${BASE_PATH}?${qs}` };
  },
  execute: async (ctx) => {
    const scope = ctx.str("scope") || "personal";
    const qs = `id=${encodeURIComponent(ctx.str("id"))}&scope=${encodeURIComponent(scope)}`;
    return deleteAgentApi(ctx, `${BASE_PATH}?${qs}`);
  },
};

export const toggleModel: Command = {
  service: "agent",
  command: "+toggle-model",
  description: "Enable or disable a model",
  flags: [
    {
      name: "id",
      type: "string",
      required: true,
      desc: "Model record ID (CUID)",
    },
    {
      name: "enabled",
      type: "boolean",
      required: true,
      desc: "true to enable, false to disable",
    },
  ],
  risk: "write",
  dryRun: (ctx) => ({
    method: "PATCH",
    url: BASE_PATH,
    body: { id: ctx.str("id"), enabled: ctx.bool("enabled") },
  }),
  execute: async (ctx) => {
    return patchAgentApi(ctx, BASE_PATH, {
      id: ctx.str("id"),
      enabled: ctx.bool("enabled"),
    });
  },
};

export const updateModel: Command = {
  service: "agent",
  command: "+update-model",
  description: "Update a custom model (id determines the record to update; personal or company scope)",
  flags: [
    { name: "id", type: "string", required: true, desc: "Model record ID (CUID) to update" },
    { name: "model-id", type: "string", required: true, desc: "Model identifier (e.g. gpt-4o)" },
    { name: "name", type: "string", required: true, desc: "Display name" },
    { name: "base-url", type: "string", required: true, desc: "API base URL (must be a valid URL)" },
    { name: "api-key", type: "string", required: false, desc: "API key; omit or empty to preserve the existing key" },
    { name: "provider", type: "string", required: false, desc: "Provider name" },
    { name: "description", type: "string", required: false, desc: "Description" },
    { name: "context-length", type: "number", required: false, desc: "Context window length" },
    { name: "connectivity-verified", type: "boolean", required: false, desc: "Whether connectivity was verified (default false; pass true after +test-model)" },
    { name: "auto-rename", type: "boolean", required: false, desc: "Auto-rename on display name conflict (append -N suffix)" },
    { name: "scope", type: "string", required: false, default: "personal", desc: "Target scope: personal | company" },
  ],
  risk: "write",
  validate: (ctx) => {
    const baseUrl = ctx.str("baseUrl");
    try {
      new URL(baseUrl);
    } catch {
      throw new Error("--base-url must be a valid URL");
    }
    const scope = ctx.str("scope");
    if (scope && !["personal", "company"].includes(scope)) {
      throw new Error("--scope must be personal or company");
    }
  },
  dryRun: (ctx) => {
    const body: Record<string, unknown> = {
      id: ctx.str("id"),
      modelId: ctx.str("modelId"),
      displayName: ctx.str("name"),
      baseUrl: ctx.str("baseUrl"),
      connectivityVerified: ctx.bool("connectivityVerified"),
    };
    const apiKey = ctx.str("apiKey");
    if (apiKey) body.apiKey = apiKey;
    const provider = ctx.str("provider");
    if (provider) body.provider = provider;
    const description = ctx.str("description");
    if (description) body.description = description;
    const contextLength = ctx.optionalNum("contextLength");
    if (contextLength !== undefined) body.contextLength = contextLength;
    if (ctx.bool("autoRename")) body.autoRename = true;
    body.scope = ctx.str("scope") || "personal";
    return { method: "POST", url: BASE_PATH, body };
  },
  execute: async (ctx) => {
    const body: Record<string, unknown> = {
      id: ctx.str("id"),
      modelId: ctx.str("modelId"),
      displayName: ctx.str("name"),
      baseUrl: ctx.str("baseUrl"),
      connectivityVerified: ctx.bool("connectivityVerified"),
    };
    const apiKey = ctx.str("apiKey");
    if (apiKey) body.apiKey = apiKey;
    const provider = ctx.str("provider");
    if (provider) body.provider = provider;
    const description = ctx.str("description");
    if (description) body.description = description;
    const contextLength = ctx.optionalNum("contextLength");
    if (contextLength !== undefined) body.contextLength = contextLength;
    if (ctx.bool("autoRename")) body.autoRename = true;
    body.scope = ctx.str("scope") || "personal";
    return postAgentApi(ctx, BASE_PATH, body);
  },
};

export const testModel: Command = {
  service: "agent",
  command: "+test-model",
  description: "Test model connectivity (LLM models only)",
  flags: [
    { name: "model-id", type: "string", required: true, desc: "Model identifier (e.g. gpt-4o)" },
    { name: "base-url", type: "string", required: true, desc: "API base URL (must be a valid URL)" },
    { name: "api-key", type: "string", required: false, desc: "API key; omit to reuse the stored key of --id" },
    { name: "provider", type: "string", required: false, desc: "Provider name" },
    { name: "id", type: "string", required: false, desc: "Existing model config ID; when --api-key is omitted, the stored key is decrypted and reused" },
  ],
  risk: "read",
  validate: (ctx) => {
    const baseUrl = ctx.str("baseUrl");
    try {
      new URL(baseUrl);
    } catch {
      throw new Error("--base-url must be a valid URL");
    }
  },
  dryRun: (ctx) => {
    const body: Record<string, unknown> = {
      modelId: ctx.str("modelId"),
      baseUrl: ctx.str("baseUrl"),
    };
    const apiKey = ctx.str("apiKey");
    if (apiKey) body.apiKey = apiKey;
    const provider = ctx.str("provider");
    if (provider) body.provider = provider;
    const id = ctx.str("id");
    if (id) body.existingConfigId = id;
    return { method: "POST", url: `${BASE_PATH}/test`, body };
  },
  execute: async (ctx) => {
    const body: Record<string, unknown> = {
      modelId: ctx.str("modelId"),
      baseUrl: ctx.str("baseUrl"),
    };
    const apiKey = ctx.str("apiKey");
    if (apiKey) body.apiKey = apiKey;
    const provider = ctx.str("provider");
    if (provider) body.provider = provider;
    const id = ctx.str("id");
    if (id) body.existingConfigId = id;
    return postAgentApi(ctx, `${BASE_PATH}/test`, body);
  },
};
