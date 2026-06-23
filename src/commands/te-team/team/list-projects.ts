import type { Command } from "../../../framework/types.js";
import { kbApi } from "../../../core/mcp-access.js";

const OAUTH_CHECK_PATH = "/agent/api/external/team/oauth/check";

export const listProjects: Command = {
  service: "team",
  command: "+list-projects",
  description:
    "List all projects available to the current user (from /api/oauth/check).",
  flags: [],
  risk: "read",
  dryRun: (ctx) => ({
    method: "POST",
    url: `${ctx.host().replace(/\/$/, "")}${OAUTH_CHECK_PATH}`,
  }),
  execute: async (ctx) => {
    const data = await kbApi(ctx, "POST", OAUTH_CHECK_PATH, {});
    return data?.projectInfoList ?? data;
  },
};
