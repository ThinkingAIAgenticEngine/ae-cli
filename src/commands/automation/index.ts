import { randomUUID } from "node:crypto";
import { currentAgentSpaceId } from "../../core/agent-space-context.js";
import { resolveWorkspaceTarget } from "../workspace/target.js";
import type { Command, Flag, RuntimeContext } from "../../framework/types.js";
import {
  getFromMainApp,
  postToMainApp,
  patchToMainApp,
  deleteFromMainApp,
  TeAgentApiError,
} from "../../core/te-agent-client.js";

const base = "/api/cli/automation/v1";
const flag = (
  name: string,
  desc: string,
  type: Flag["type"] = "string",
  required = false,
): Flag => ({ name, desc, type, required });
const idFlag = flag("id", "Automation ID from list or create", "string", true);
const typeFlag = flag(
  "target-type",
  "agent | team; identifies the existing target on update",
  "string",
  true,
);
const scopeFlag = flag(
  "agent-space-id",
  "Explicit space; otherwise current AgentSpace, then personal space",
);
const runFlag = flag(
  "run-id",
  "Execution ID from run or runs list",
  "string",
  true,
);
const pageFlags = [
  flag("limit", "Page size, 1-100 (default 20)", "number"),
  flag("cursor", "Opaque nextCursor from the previous page"),
];
const waitFlags = [
  flag("wait", "Wait for this execution to finish", "boolean"),
  flag("timeout", "Wait timeout in seconds, 1-86400 (default 300)", "number"),
];
const requestFlag = flag(
  "command-id",
  "Stable idempotency key; reuse it after an uncertain response",
);
const configFlags = [
  typeFlag,
  flag("name", "Automation name"),
  {
    ...flag("message", "Task instructions; an empty string clears it"),
    sensitive: true,
  },
  flag("clear-message", "Clear task instructions explicitly", "boolean"),
  flag("trigger-type", "scheduled | manual"),
  flag("status", "active | paused"),
  flag(
    "cron-expression",
    "Five-field hourly, daily, weekly or monthly schedule",
  ),
  flag("schedule-kind", "hourly | daily | weekly | monthly"),
  flag("time", "HH:mm in server timezone"),
  flag("minute", "Hourly minute, 0-59", "number"),
  flag("weekday", "Weekly day, 0=Sunday through 6=Saturday", "number"),
  flag(
    "weekdays",
    "Weekly days as JSON array, 0=Sunday through 6=Saturday",
    "json",
  ),
  flag(
    "day-of-month",
    "Monthly day, 1-31; missing dates are skipped",
    "number",
  ),
  flag(
    "days-of-month",
    'Monthly days as JSON array: integers 1-31 or "L" for last day; missing dates are skipped',
    "json",
  ),
  flag("model", "Agent model configuration ID; null clears the override"),
  flag("reuse-conversation", "Agent: true | false", "json"),
  {
    ...flag("scope", "Team data scope JSON; null clears it", "json"),
    sensitive: true,
  },
  flag(
    "channels",
    "Agent or Team notification channel array; [] clears external notifications",
    "json",
  ),
  flag("feishu-chat-id", "Feishu destination; null clears it"),
  flag("lark-chat-id", "Lark destination; null clears it"),
  flag("slack-channel-id", "Slack destination; null clears it"),
  flag(
    "save-to-knowledge-base-id",
    "Team output knowledge base ID; null clears it",
  ),
];
function enumValue(value: string, values: string[], name: string) {
  if (value && !values.includes(value))
    throw new Error(`--${name} must be ${values.join(" | ")}`);
}
function range(value: number, min: number, max: number, name: string) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`--${name} must be an integer from ${min} to ${max}`);
  return value;
}
function key(ctx: RuntimeContext, name: string) {
  const value = ctx.str(name);
  if (!value || value.length > 191)
    throw new Error(`${name} must be a non-empty ID of at most 191 characters`);
  return encodeURIComponent(value);
}
export function configuration(
  ctx: RuntimeContext,
  create: boolean,
): Record<string, unknown> {
  const targetType = ctx.str("targetType");
  enumValue(targetType, ["agent", "team"], "target-type");
  if (!targetType) throw new Error("--target-type is required");
  const result: Record<string, unknown> = {};
  if (create) {
    result.targetType = targetType;
    result[targetType === "agent" ? "agentId" : "teamId"] = decodeURIComponent(
      key(ctx, targetType === "agent" ? "agentId" : "teamId"),
    );
  }
  for (const name of ["name", "message", "triggerType", "status"]) {
    if (ctx.str(name)) result[name] = ctx.str(name);
  }
  if (ctx.bool("clearMessage")) {
    if (ctx.str("message")) throw new Error("Use --message or --clear-message");
    result.message = "";
  }
  if (create && ctx.str(targetType === "agent" ? "teamId" : "agentId"))
    throw new Error("Specify only the selected target ID");
  if (create && !ctx.str("name").trim()) throw new Error("--name is required");
  const name = ctx.str("name");
  if (name && !name.trim()) throw new Error("--name must not be blank");
  if (targetType === "team") {
    if (name.length > 191 || Array.from(name.replace(/\s/g, "")).length > 50)
      throw new Error(
        "--name must contain at most 50 non-whitespace characters (191 raw code units)",
      );
  } else if (name.trim().length > 100) {
    throw new Error("--name must contain at most 100 characters");
  }
  enumValue(ctx.str("triggerType"), ["scheduled", "manual"], "trigger-type");
  enumValue(ctx.str("status"), ["active", "paused"], "status");
  const kind = ctx.str("scheduleKind"),
    cron = ctx.str("cronExpression");
  enumValue(kind, ["hourly", "daily", "weekly", "monthly"], "schedule-kind");
  if (kind && cron) throw new Error("Use --schedule-kind or --cron-expression");
  if (
    !kind &&
    (["time", "minute", "weekday", "dayOfMonth"].some((name) =>
      ctx.str(name),
    ) ||
      ctx.json("weekdays") !== undefined ||
      ctx.json("daysOfMonth") !== undefined)
  )
    throw new Error("Schedule details require --schedule-kind");
  if (
    (kind &&
      (ctx.str("weekday") || ctx.json("weekdays") !== undefined) &&
      kind !== "weekly") ||
    (kind &&
      (ctx.str("dayOfMonth") || ctx.json("daysOfMonth") !== undefined) &&
      kind !== "monthly") ||
    (kind && ctx.str("minute") && kind !== "hourly")
  )
    throw new Error("Schedule field is not applicable to this frequency");
  if (kind) {
    const dateSelection = (
      single: string,
      multiple: string,
      min: number,
      max: number,
      label: string,
      allowLastDay = false,
    ) => {
      const values = ctx.json(multiple);
      if (values === undefined)
        return {
          [single]: range(ctx.optionalNum(single) ?? NaN, min, max, label),
        };
      if (ctx.optionalNum(single) !== undefined)
        throw new Error(`Use --${label} or its plural array, not both`);
      if (
        !Array.isArray(values) ||
        !values.length ||
        values.length > max - min + 1 + Number(allowLastDay) ||
        values.some(
          (value) =>
            !(allowLastDay && value === "L") &&
            (!Number.isInteger(value) || value < min || value > max),
        )
      )
        throw new Error(
          `${multiple} must be a non-empty JSON array of integers from ${min} to ${max}${allowLastDay ? ' or "L" for last day' : ""}`,
        );
      return {
        [multiple]: [...new Set(values)].sort(
          (a, b) => (a === "L" ? 32 : a) - (b === "L" ? 32 : b),
        ),
      };
    };
    const schedule: Record<string, unknown> = { kind };
    if (kind === "hourly")
      schedule.minute = range(ctx.optionalNum("minute") ?? 0, 0, 59, "minute");
    else {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(ctx.str("time")))
        throw new Error("--time must use HH:mm");
      schedule.time = ctx.str("time");
      if (kind === "weekly")
        Object.assign(
          schedule,
          dateSelection("weekday", "weekdays", 0, 6, "weekday"),
        );
      if (kind === "monthly")
        Object.assign(
          schedule,
          dateSelection(
            "dayOfMonth",
            "daysOfMonth",
            1,
            31,
            "day-of-month",
            true,
          ),
        );
    }
    result.schedule = schedule;
  }
  if (cron) {
    const parts = cron.trim().split(/\s+/);
    const validNumber = (v: string, a: number, b: number) =>
      /^\d+$/.test(v) && Number(v) >= a && Number(v) <= b;
    const validDays = (v: string, a: number, b: number, allowLastDay = false) =>
      v.split(",").length <= b - a + 1 + Number(allowLastDay) &&
      v
        .split(",")
        .every(
          (day) => (allowLastDay && day === "L") || validNumber(day, a, b),
        );
    const [m, h, d, mo, w] = parts;
    if (
      parts.length !== 5 ||
      !validNumber(m, 0, 59) ||
      !(h === "*" || validNumber(h, 0, 23)) ||
      mo !== "*" ||
      !(d === "*" || validDays(d, 1, 31, true)) ||
      !(w === "*" || validDays(w, 0, 6)) ||
      (d !== "*" && w !== "*") ||
      (h === "*" && (d !== "*" || w !== "*"))
    )
      throw new Error(
        "--cron-expression must specify an hourly, daily, weekly or monthly schedule",
      );
    result.cronExpression = cron;
  }
  if (
    create &&
    (ctx.str("triggerType") || "scheduled") === "scheduled" &&
    !kind &&
    !cron
  )
    throw new Error("Scheduled automation requires a schedule");
  const agentNames = ["model", "reuseConversation"];
  const teamNames = ["scope", "saveToKnowledgeBaseId"];
  const notificationNames = [
    "channels",
    "feishuChatId",
    "larkChatId",
    "slackChannelId",
  ];
  for (const name of [...agentNames, ...teamNames, ...notificationNames]) {
    const json = ["scope", "channels", "reuseConversation"].includes(name);
    const value = json ? ctx.json(name) : ctx.str(name) || undefined;
    if (value === undefined) continue;
    if (
      !notificationNames.includes(name) &&
      (agentNames.includes(name) ? "agent" : "team") !== targetType
    )
      throw new Error(`${name} is not applicable to ${targetType} automations`);
    if (name === "reuseConversation" && typeof value !== "boolean")
      throw new Error("--reuse-conversation must be true or false");
    if (
      name === "channels" &&
      (!Array.isArray(value) ||
        value.some(
          (v) =>
            ![
              "feishu",
              "lark",
              "slack",
              "discord",
              "dingtalk",
              "wecom",
              "mattermost",
              "google_chat",
              "zoom_chat",
              "whatsapp",
            ].includes(v),
        ))
    )
      throw new Error(
        "--channels must contain supported notification channels",
      );
    if (
      name === "scope" &&
      value !== null &&
      (typeof value !== "object" || Array.isArray(value))
    )
      throw new Error("--scope must be an object or null");
    result[name === "scope" ? "scopeJson" : name] =
      name === "scope"
        ? value === null
          ? null
          : JSON.stringify(value)
        : value === "null"
          ? null
          : value;
  }
  if (!create && !Object.keys(result).length)
    throw new Error("No fields to update");
  if (create) result.triggerImmediately = ctx.bool("triggerImmediately");
  return result;
}
async function query(ctx: RuntimeContext, list = false, typed = false) {
  const p = new URLSearchParams();
  let spaceId = ctx.str("agentSpaceId").trim() || currentAgentSpaceId();
  if (!spaceId && process.env.TE_AGENT_CONVERSATION_ID?.trim()) {
    spaceId = (await resolveWorkspaceTarget(ctx)).agentSpaceId;
  }
  if (spaceId) p.set("agentSpaceId", spaceId);
  if (typed && ctx.str("targetType"))
    p.set("targetType", ctx.str("targetType"));
  if (list)
    for (const k of ["limit", "cursor", "status", "q", "targetType"])
      if (ctx.str(k)) p.set(k, ctx.str(k));
  return p.size ? `?${p}` : "";
}
async function request(
  ctx: RuntimeContext,
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  if (method === "GET")
    return getFromMainApp(
      path,
      ctx.hostOverride ? ctx.hostOverride() : ctx.host(),
      "cli-token",
    );
  if (method === "POST")
    return postToMainApp(
      path,
      body,
      ctx.hostOverride ? ctx.hostOverride() : ctx.host(),
      "cli-token",
    );
  if (method === "PATCH")
    return patchToMainApp(
      path,
      body,
      ctx.hostOverride ? ctx.hostOverride() : ctx.host(),
      "cli-token",
    );
  return deleteFromMainApp(
    path,
    ctx.hostOverride ? ctx.hostOverride() : ctx.host(),
    "cli-token",
  );
}

function withDryRun(path: string) {
  return `${path}${path.includes("?") ? "&" : "?"}dryRun=true`;
}

function redactedPreview(method: string, path: string, body?: unknown) {
  return {
    method,
    url: path,
    ...(body === undefined ? {} : { body: { payload: "[REDACTED]" } }),
  };
}
export async function waitForRun(
  ctx: RuntimeContext,
  id: string,
  runId: string,
) {
  const deadline = Date.now() + (ctx.optionalNum("timeout") ?? 300) * 1000;
  do {
    const result = await request(
      ctx,
      "GET",
      `${base}/${encodeURIComponent(id)}/runs/${encodeURIComponent(runId)}/result${await query(ctx)}`,
    );
    if (result.status !== "running")
      return { ...result, executionCompleted: true, timedOut: false };
    if (Date.now() >= deadline)
      return { ...result, executionCompleted: false, timedOut: true };
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(1000, deadline - Date.now())),
    );
  } while (true);
}
type Action = {
  command: string;
  resource?: string;
  method: string;
  suffix: (ctx: RuntimeContext) => string;
  flags?: Flag[];
  body?: (ctx: RuntimeContext) => Record<string, unknown>;
  highRisk?: boolean;
  list?: boolean;
  typed?: boolean;
  wait?: boolean;
};
const actions: Action[] = [
  {
    command: "list",
    method: "GET",
    suffix: () => "",
    flags: [
      ...pageFlags,
      flag("target-type", "Filter agent | team"),
      flag("status", "Filter active | paused"),
      flag("q", "Search automation name"),
    ],
    list: true,
  },
  {
    command: "get",
    method: "GET",
    suffix: (c) => `/${key(c, "id")}`,
    flags: [idFlag],
  },
  {
    command: "create",
    method: "POST",
    suffix: () => "",
    flags: [
      ...configFlags,
      flag("agent-id", "Agent target ID"),
      flag("team-id", "Team target ID"),
      flag(
        "trigger-immediately",
        "Execute once after successful creation",
        "boolean",
      ),
      requestFlag,
      ...waitFlags,
    ],
    body: (c) => configuration(c, true),
    wait: true,
  },
  {
    command: "update",
    method: "PATCH",
    suffix: (c) => `/${key(c, "id")}`,
    flags: [idFlag, ...configFlags],
    body: (c) => configuration(c, false),
    typed: true,
  },
  ...["enable", "disable"].map((command): Action => ({
    command,
    method: "PATCH",
    suffix: (c) => `/${key(c, "id")}`,
    flags: [idFlag],
    body: () => ({ status: command === "enable" ? "active" : "paused" }),
  })),
  {
    command: "delete",
    method: "DELETE",
    suffix: (c) => `/${key(c, "id")}`,
    flags: [idFlag],
    highRisk: true,
  },
  {
    command: "run",
    method: "POST",
    suffix: (c) => `/${key(c, "id")}/run`,
    flags: [idFlag, requestFlag, ...waitFlags],
    body: () => ({}),
    wait: true,
  },
  {
    command: "list",
    resource: "runs",
    method: "GET",
    suffix: (c) => `/${key(c, "id")}/runs`,
    flags: [idFlag, ...pageFlags],
    list: true,
  },
  ...["get", "result", "stop", "retry"].map((command): Action => ({
    command,
    resource: "runs",
    method: ["stop", "retry"].includes(command) ? "POST" : "GET",
    suffix: (c) =>
      `/${key(c, "id")}/runs/${key(c, "runId")}${command === "get" ? "" : `/${command}`}`,
    flags: [
      idFlag,
      runFlag,
      ...(command === "retry" ? [requestFlag, ...waitFlags] : []),
    ],
    body: ["stop", "retry"].includes(command) ? () => ({}) : undefined,
    highRisk: command === "stop",
    wait: command === "retry",
  })),
];
export const automationCommands: Command[] = actions.map((a) => ({
  service: "automation",
  resource: a.resource,
  command: a.command,
  description: `${a.command} ${a.resource ? "an automation execution" : "Agent or team automations"} (Transitional TE REST)`,
  risk: a.highRisk ? "high-risk-write" : a.method === "GET" ? "read" : "write",
  flags: [scopeFlag, ...(a.flags ?? [])],
  validate: (ctx) => {
    a.suffix(ctx);
    a.body?.(ctx);
    if (ctx.str("commandId").length > 191)
      throw new Error("--command-id must contain at most 191 characters");
    if (ctx.optionalNum("limit") !== undefined)
      range(ctx.num("limit"), 1, 100, "limit");
    if (ctx.optionalNum("timeout") !== undefined)
      range(ctx.num("timeout"), 1, 86400, "timeout");
    enumValue(ctx.str("targetType"), ["agent", "team"], "target-type");
    enumValue(ctx.str("status"), ["active", "paused"], "status");
    if (
      a.command === "create" &&
      ctx.bool("wait") &&
      !ctx.bool("triggerImmediately")
    )
      throw new Error("--wait on create requires --trigger-immediately");
  },
  dryRun: async (ctx) => {
    const body = a.body?.(ctx);
    const commandId = ctx.str("commandId") || randomUUID();
    const requestBody = body && {
      ...body,
      ...(a.wait ? { commandId } : {}),
    };
    const path = base + a.suffix(ctx) + (await query(ctx, a.list, a.typed));
    return {
      request: redactedPreview(a.method, path, requestBody),
      validation: await request(ctx, a.method, withDryRun(path), requestBody),
    };
  },
  execute: async (ctx) => {
    const body = a.body?.(ctx),
      commandId = ctx.str("commandId") || randomUUID();
    let output;
    try {
      output = await request(
        ctx,
        a.method,
        base + a.suffix(ctx) + (await query(ctx, a.list, a.typed)),
        body && { ...body, ...(a.wait ? { commandId } : {}) },
      );
    } catch (error) {
      if (a.wait && a.command !== "create" && error instanceof TeAgentApiError)
        throw new TeAgentApiError(
          error.message,
          error.status,
          error.code,
          error.body,
          error.errorType,
          [
            error.hint,
            `Keep command ID ${commandId}. Reuse it when checking or retrying this execution request.`,
          ]
            .filter(Boolean)
            .join(" "),
          error.details,
        );
      throw error;
    }
    if (!a.wait) return output;
    const runId =
      a.command === "create" ? output.execution?.runId : output.runId;
    const id = a.command === "create" ? output.automation.id : ctx.str("id");
    const accepted = { ...output, commandId };
    if (!ctx.bool("wait") || !runId) return accepted;
    try {
      return { ...accepted, result: await waitForRun(ctx, id, runId) };
    } catch (error) {
      return {
        ...accepted,
        observation: {
          status: "failed",
          code:
            error instanceof TeAgentApiError
              ? error.code
              : "OBSERVATION_FAILED",
          message:
            "Execution was accepted, but result polling failed. Read the existing run; do not create or trigger again.",
          automationId: id,
          runId,
        },
      };
    }
  },
}));
export default automationCommands;
