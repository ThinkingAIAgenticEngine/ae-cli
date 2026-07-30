/**
 * Agent conversation archive commands.
 *
 * +find-archived-conversations searches archived conversations for one Agent or all Agents.
 * +restore-conversation restores one archived conversation by ID.
 */

import type { Command, RuntimeContext } from "../../framework/types.js";
import { getFromMainApp, postToMainApp } from "../../core/te-agent-client.js";

const CONVERSATION_PATH = "/api/sandbox/agent/conversations";
const ARCHIVE_SEARCH_PATH = `${CONVERSATION_PATH}/archived`;
const DEFAULT_LIMIT = 20;
const DEFAULT_TIME_ZONE = "Asia/Shanghai";

type ArchivedConversationApiItem = {
  id: string;
  title: string;
  lastPreview: string | null;
  archivedAt: string;
  updatedAt: string;
  agent: {
    id: string;
    name: string;
    avatarUrl?: string;
    scope?: string;
  } | null;
};

type ArchivedConversationApiResult = {
  items: ArchivedConversationApiItem[];
  hasMore: boolean;
};

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function envOptional(name: string): string | undefined {
  return optional(process.env[name] ?? "");
}

function readAll(ctx: RuntimeContext): boolean {
  return ctx.str("all") === "true";
}

function readTimeZone(ctx: RuntimeContext): string {
  return optional(ctx.str("timeZone")) ?? DEFAULT_TIME_ZONE;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function formatTimestampInTimeZone(
  timestamp: string,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function validateFind(ctx: RuntimeContext): void {
  const rawAll = ctx.str("all");
  if (rawAll && rawAll !== "true" && rawAll !== "false") return;

  const agentId = optional(ctx.str("agentId"));
  const all = readAll(ctx);
  if (agentId && all) {
    throw new Error("--agent-id and --all true cannot be used together");
  }
  if (!agentId && !all && !envOptional("TE_AGENT_CURRENT_AGENT_ID")) {
    throw new Error(
      "Archive scope is required. Provide --agent-id or --all true, or run inside an Agent sandbox.",
    );
  }

  const limit = optional(ctx.str("limit")) ? ctx.num("limit") : DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("--limit must be an integer between 1 and 100");
  }

  if (!isValidTimeZone(readTimeZone(ctx))) {
    throw new Error("--time-zone must be a valid IANA time zone");
  }
}

export function buildArchivedConversationSearchPath(
  ctx: RuntimeContext,
): string {
  const params = new URLSearchParams();
  const q = optional(ctx.str("q"));
  const explicitAgentId = optional(ctx.str("agentId"));
  const all = readAll(ctx);
  const agentId = explicitAgentId ?? envOptional("TE_AGENT_CURRENT_AGENT_ID");
  const limit = optional(ctx.str("limit")) ? ctx.num("limit") : DEFAULT_LIMIT;

  if (q) params.set("q", q);
  if (all) params.set("all", "true");
  else if (agentId) params.set("agentId", agentId);
  params.set("limit", String(limit));
  return `${ARCHIVE_SEARCH_PATH}?${params.toString()}`;
}

function toArchivedConversationOutput(
  item: ArchivedConversationApiItem,
  timeZone: string,
) {
  return {
    conversation_id: item.id,
    title: item.title,
    last_preview: item.lastPreview,
    archived_at: item.archivedAt,
    archived_at_local: formatTimestampInTimeZone(item.archivedAt, timeZone),
    updated_at: item.updatedAt,
    updated_at_local: formatTimestampInTimeZone(item.updatedAt, timeZone),
    time_zone: timeZone,
    agent: item.agent
      ? {
          agent_id: item.agent.id,
          name: item.agent.name,
          avatar_url: item.agent.avatarUrl,
          scope: item.agent.scope,
        }
      : null,
  };
}

export const findArchivedConversations: Command = {
  service: "agent",
  command: "+find-archived-conversations",
  description: "Find archived conversations for one Agent or all Agents",
  flags: [
    {
      name: "q",
      type: "string",
      required: false,
      desc: "Optional keyword matched against conversation titles and message previews",
    },
    {
      name: "agent-id",
      type: "string",
      required: false,
      desc: "Agent ID; defaults to TE_AGENT_CURRENT_AGENT_ID inside an Agent sandbox",
    },
    {
      name: "all",
      type: "boolean",
      required: false,
      desc: "Set true to search archived conversations across all Agents",
    },
    {
      name: "limit",
      type: "number",
      required: false,
      default: DEFAULT_LIMIT,
      min: 1,
      max: 100,
      desc: "Maximum number of archived conversations to return, 1-100; default 20",
    },
    {
      name: "time-zone",
      type: "string",
      required: false,
      default: DEFAULT_TIME_ZONE,
      desc: "IANA time zone used for local timestamp fields; default Asia/Shanghai",
    },
  ],
  risk: "read",
  validate: validateFind,
  dryRun: (ctx) => ({
    method: "GET",
    url: buildArchivedConversationSearchPath(ctx),
  }),
  execute: async (ctx) => {
    const timeZone = readTimeZone(ctx);
    const result = await getFromMainApp<ArchivedConversationApiResult>(
      buildArchivedConversationSearchPath(ctx),
    );
    return {
      items: result.items.map((item) =>
        toArchivedConversationOutput(item, timeZone),
      ),
      has_more: result.hasMore,
    };
  },
};

export const restoreConversation: Command = {
  service: "agent",
  command: "+restore-conversation",
  description: "Restore an archived conversation by conversation ID",
  flags: [
    {
      name: "conversation-id",
      type: "string",
      required: true,
      desc: "Conversation ID returned by +find-archived-conversations",
    },
  ],
  risk: "write",
  dryRun: (ctx) => ({
    method: "POST",
    url: `${CONVERSATION_PATH}/${encodeURIComponent(ctx.str("conversationId"))}/restore`,
    body: {},
  }),
  execute: async (ctx) => {
    const result = await postToMainApp<{
      changed: boolean;
      conversationId: string;
    }>(
      `${CONVERSATION_PATH}/${encodeURIComponent(ctx.str("conversationId"))}/restore`,
      {},
    );
    return { changed: result.changed, conversation_id: result.conversationId };
  },
};
