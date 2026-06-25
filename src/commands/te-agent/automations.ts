/**
 * ae-cli agent 自动化任务命令
 *
 * +create-automation — 通过沙箱内部 API 创建 Agent 自动化任务
 * +list-automations — 查询当前用户自动化任务
 * +update-automation — 更新自动化任务名称、指令、时间或启停状态
 */

import type { Command, RuntimeContext } from "../../framework/types.js";
import {
  getFromMainApp,
  patchToMainApp,
  postToMainApp,
} from "../../core/te-agent-client.js";

const BASE_PATH = "/api/sandbox/agent/automations";
const SCHEDULE_KINDS = ["hourly", "daily", "weekly", "monthly"];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const AUTOMATION_STATUSES = ["active", "paused"];

type ScheduleBody =
  | { kind: "hourly"; minute?: number }
  | { kind: "daily"; time: string }
  | { kind: "weekly"; time: string; weekday: number }
  | { kind: "monthly"; time: string; dayOfMonth: number };

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function envOptional(name: string): string | undefined {
  return optional(process.env[name] ?? "");
}

function readEnabled(ctx: RuntimeContext): boolean {
  return readEnabledOptional(ctx) ?? true;
}

function readEnabledOptional(ctx: RuntimeContext): boolean | undefined {
  const enabled = ctx.json("enabled");
  if (enabled === undefined) return undefined;
  if (typeof enabled !== "boolean") {
    throw new Error("--enabled 必须是 true 或 false");
  }
  return enabled;
}

function buildSchedule(ctx: RuntimeContext): ScheduleBody | undefined {
  const kind = optional(ctx.str("scheduleKind"));
  if (!kind) return undefined;

  if (kind === "hourly") {
    const minute = ctx.str("minute") ? ctx.num("minute") : undefined;
    return { kind, ...(minute === undefined ? {} : { minute }) };
  }
  if (kind === "daily") return { kind, time: ctx.str("time") };
  if (kind === "weekly") {
    return { kind, time: ctx.str("time"), weekday: ctx.num("weekday") };
  }
  return {
    kind: "monthly",
    time: ctx.str("time"),
    dayOfMonth: ctx.num("dayOfMonth"),
  };
}

function hasScheduleDetail(ctx: RuntimeContext): boolean {
  return Boolean(
    optional(ctx.str("time")) ||
      optional(ctx.str("minute")) ||
      optional(ctx.str("weekday")) ||
      optional(ctx.str("dayOfMonth")),
  );
}

function validateSchedule(ctx: RuntimeContext, required: boolean): void {
  const cron = optional(ctx.str("cron"));
  const kind = optional(ctx.str("scheduleKind"));
  if (cron && kind) {
    throw new Error("--cron 与 --schedule-kind 只能二选一");
  }
  if (!cron && !kind) {
    if (required || hasScheduleDetail(ctx)) {
      throw new Error("必须提供 --cron 或 --schedule-kind");
    }
    return;
  }
  if (!kind) return;
  if (!SCHEDULE_KINDS.includes(kind)) {
    throw new Error("--schedule-kind 必须是 hourly、daily、weekly 或 monthly");
  }

  const time = optional(ctx.str("time"));
  if (kind !== "hourly") {
    if (!time) throw new Error(`${kind} 调度必须提供 --time HH:mm`);
    if (!TIME_RE.test(time)) throw new Error("--time 格式必须是 HH:mm");
  }

  if (kind === "hourly" && ctx.str("minute")) {
    const minute = ctx.num("minute");
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      throw new Error("--minute 必须是 0-59 的整数");
    }
  }
  if (kind === "weekly") {
    const weekday = ctx.num("weekday");
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new Error("--weekday 必须是 0-6 的整数，0 表示周日");
    }
  }
  if (kind === "monthly") {
    const dayOfMonth = ctx.num("dayOfMonth");
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
      throw new Error("--day-of-month 必须是 1-28 的整数");
    }
  }
}

function buildCreateBody(ctx: RuntimeContext) {
  const explicitAgentId = optional(ctx.str("agentId"));
  const explicitAgentName = optional(ctx.str("agentName"));
  const agentId =
    explicitAgentId ??
    (explicitAgentName ? undefined : envOptional("TE_AGENT_CURRENT_AGENT_ID"));
  const conversationId =
    optional(ctx.str("conversationId")) ??
    envOptional("TE_AGENT_CONVERSATION_ID");
  const model =
    optional(ctx.str("model")) ?? envOptional("TE_AGENT_CURRENT_MODEL_ID");
  const enabled = readEnabled(ctx);

  return {
    name: ctx.str("name"),
    message: ctx.str("message"),
    agentId,
    agentName: explicitAgentName,
    conversationId,
    cronExpression: optional(ctx.str("cron")),
    schedule: buildSchedule(ctx),
    triggerType: "scheduled",
    model,
    status: enabled ? "active" : "paused",
  };
}

function buildListPath(ctx: RuntimeContext): string {
  const params = new URLSearchParams();
  const q = optional(ctx.str("q"));
  const status = optional(ctx.str("status"));
  const limit = optional(ctx.str("limit"));
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (limit) params.set("limit", String(ctx.num("limit")));
  const query = params.toString();
  return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

function validateList(ctx: RuntimeContext): void {
  const status = optional(ctx.str("status"));
  if (status && !AUTOMATION_STATUSES.includes(status)) {
    throw new Error("--status 必须是 active 或 paused");
  }
  if (ctx.str("limit")) {
    const limit = ctx.num("limit");
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new Error("--limit 必须是 1-10000 的整数");
    }
  }
}

function buildUpdateBody(ctx: RuntimeContext) {
  const enabled = readEnabledOptional(ctx);
  const body: Record<string, unknown> = {};
  const name = optional(ctx.str("name"));
  const message = optional(ctx.str("message"));
  const cron = optional(ctx.str("cron"));
  const schedule = buildSchedule(ctx);

  if (name) body.name = name;
  if (message !== undefined) body.message = message;
  if (enabled !== undefined) body.status = enabled ? "active" : "paused";
  if (cron) body.cronExpression = cron;
  if (schedule) body.schedule = schedule;

  return body;
}

function validateUpdate(ctx: RuntimeContext): void {
  validateSchedule(ctx, false);
  if (!Object.keys(buildUpdateBody(ctx)).length) {
    throw new Error("至少提供一个更新字段");
  }
}

const scheduleFlags = [
  {
    name: "cron",
    type: "string" as const,
    required: false,
    desc: "Cron expression for supported hourly/daily/weekly/monthly schedules",
  },
  {
    name: "schedule-kind",
    type: "string" as const,
    required: false,
    desc: "hourly | daily | weekly | monthly",
  },
  {
    name: "time",
    type: "string" as const,
    required: false,
    desc: "Time in HH:mm for daily/weekly/monthly",
  },
  {
    name: "minute",
    type: "number" as const,
    required: false,
    desc: "Minute 0-59 for hourly schedules",
  },
  {
    name: "weekday",
    type: "number" as const,
    required: false,
    desc: "Weekday 0-6 for weekly schedules; 0 is Sunday",
  },
  {
    name: "day-of-month",
    type: "number" as const,
    required: false,
    desc: "Day 1-28 for monthly schedules",
  },
];

export const listAutomations: Command = {
  service: "agent",
  command: "+list-automations",
  description: "List current user's Agent automation tasks",
  flags: [
    {
      name: "q",
      type: "string",
      required: false,
      desc: "Keyword for automation name or instruction",
    },
    {
      name: "status",
      type: "string",
      required: false,
      desc: "active | paused",
    },
    {
      name: "limit",
      type: "number",
      required: false,
      desc: "Maximum number of automations to return, 1-10000",
    },
  ],
  risk: "read",
  validate: validateList,
  dryRun: (ctx) => ({
    method: "GET",
    url: buildListPath(ctx),
  }),
  execute: async (ctx) => getFromMainApp(buildListPath(ctx)),
};

export const createAutomation: Command = {
  service: "agent",
  command: "+create-automation",
  description: "Create an Agent automation task",
  flags: [
    {
      name: "name",
      type: "string",
      required: true,
      desc: "Automation task name",
    },
    {
      name: "message",
      type: "string",
      required: true,
      desc: "Instruction sent to the Agent",
    },
    {
      name: "agent-id",
      type: "string",
      required: false,
      desc: "Agent ID; defaults to current conversation Agent",
    },
    {
      name: "agent-name",
      type: "string",
      required: false,
      desc: "Agent name; use only after +list-agents discovery",
    },
    {
      name: "model",
      type: "string",
      required: false,
      desc: "Model record ID; defaults to current selected model",
    },
    {
      name: "enabled",
      type: "boolean",
      required: false,
      desc: "Whether to enable the automation immediately; defaults to true",
    },
    {
      name: "conversation-id",
      type: "string",
      required: false,
      desc: "Conversation ID fallback for resolving current Agent",
    },
    ...scheduleFlags,
  ],
  risk: "write",
  validate: (ctx) => {
    if (ctx.str("agentId") && ctx.str("agentName")) {
      throw new Error("--agent-id 与 --agent-name 只能二选一");
    }
    validateSchedule(ctx, true);
  },
  dryRun: (ctx) => ({
    method: "POST",
    url: BASE_PATH,
    body: buildCreateBody(ctx),
  }),
  execute: async (ctx) => postToMainApp(BASE_PATH, buildCreateBody(ctx)),
};

export const updateAutomation: Command = {
  service: "agent",
  command: "+update-automation",
  description: "Update an Agent automation task",
  flags: [
    {
      name: "id",
      type: "string",
      required: true,
      desc: "Automation task ID from +list-automations",
    },
    {
      name: "name",
      type: "string",
      required: false,
      desc: "New automation task name",
    },
    {
      name: "message",
      type: "string",
      required: false,
      desc: "New instruction sent to the Agent",
    },
    {
      name: "enabled",
      type: "boolean",
      required: false,
      desc: "true to enable, false to pause",
    },
    ...scheduleFlags,
  ],
  risk: "write",
  validate: validateUpdate,
  dryRun: (ctx) => ({
    method: "PATCH",
    url: `${BASE_PATH}/${encodeURIComponent(ctx.str("id"))}`,
    body: buildUpdateBody(ctx),
  }),
  execute: async (ctx) =>
    patchToMainApp(
      `${BASE_PATH}/${encodeURIComponent(ctx.str("id"))}`,
      buildUpdateBody(ctx),
    ),
};
