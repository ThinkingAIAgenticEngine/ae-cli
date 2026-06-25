/**
 * ae-cli agent Agent 查询命令
 *
 * +list-agents — 列出当前用户可见 Agent
 */

import type { Command } from "../../framework/types.js";
import { getFromMainApp } from "../../core/te-agent-client.js";

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
  execute: async (ctx) => getFromMainApp(`${BASE_PATH}${buildQuery(ctx)}`),
};
