import { parityActions } from "./parity-actions.js";
import {
  collectThingDetail,
  collectThingDigest,
  thingsWindow,
} from "./collect.js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Command, Flag, RuntimeContext } from "../../framework/types.js";
import { requestThings, thingsUrl } from "./client.js";

const targetFlags: Flag[] = [
  {
    name: "agent-space-id",
    type: "string",
    desc: "Explicit space; must match the current conversation",
  },
];
const idFlag: Flag = {
  name: "id",
  type: "string",
  required: true,
  desc: "Resource ID returned by the API",
};
const commandFlag: Flag = {
  name: "command-id",
  type: "string",
  desc: "Stable UUID for safe retries; generated when omitted",
};
const versionFlag: Flag = {
  name: "expected-version",
  type: "number",
  required: true,
  min: 1,
  desc: "Version read before this edit",
};
const pageFlags: Flag[] = [
  {
    name: "limit",
    type: "number",
    min: 1,
    max: 100,
    desc: "Page size, at most 100",
  },
  {
    name: "cursor",
    type: "string",
    desc: "Opaque cursor from the previous response",
  },
];
const thingFlags: Flag[] = [
  {
    name: "title",
    type: "string",
    sensitive: true,
    desc: "Thing title, 1 to 200 characters",
  },
  {
    name: "description",
    type: "string",
    sensitive: true,
    desc: "Required when creating; at most 10000 characters",
  },
  {
    name: "tags",
    type: "string",
    sensitive: true,
    desc: "JSON array of tags; [] clears tags",
  },
  { name: "status", type: "string", desc: "open | paused | done" },
  {
    name: "assignee-id",
    type: "string",
    desc: "Active member ID; creation defaults to self; null is rejected",
  },
  {
    name: "collaborator-ids",
    type: "string",
    desc: "JSON array of member IDs; [] clears collaborators",
  },
  {
    name: "file",
    type: "string",
    sensitive: true,
    desc: "UTF-8 JSON file containing thing fields",
  },
  {
    name: "stdin",
    type: "boolean",
    desc: "Read thing field JSON from standard input",
  },
];

export function validThingsId(value: string) {
  if (!/^[A-Za-z0-9_-]{1,191}$/.test(value))
    throw new Error("Invalid resource identifier");
  return value;
}

export function thingsTarget(ctx: RuntimeContext) {
  const agentSpaceId = ctx.str("agentSpaceId").trim();
  const conversationId = process.env.TE_AGENT_CONVERSATION_ID?.trim();
  if (!agentSpaceId && !conversationId)
    throw new Error(
      "Specify --agent-space-id or run inside a Web Agent conversation",
    );
  return {
    ...(agentSpaceId ? { agentSpaceId: validThingsId(agentSpaceId) } : {}),
    ...(conversationId
      ? { conversationId: validThingsId(conversationId) }
      : {}),
  };
}

function query(values: Record<string, unknown>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined) q.set(key, String(value));
  return q.size ? `?${q}` : "";
}

async function root(ctx: RuntimeContext) {
  const selected = thingsTarget(ctx);
  const resolved = await requestThings<{ agentSpaceId: string }>(
    ctx,
    "GET",
    `target${query(selected)}`,
  );
  const id = validThingsId(resolved.agentSpaceId);
  if (selected.agentSpaceId && selected.agentSpaceId !== id)
    throw new Error("Server resolved a conflicting space");
  return `agent-spaces/${id}`;
}

function pageQuery(ctx: RuntimeContext) {
  const limit = ctx.optionalNum("limit") ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("--limit must be between 1 and 100");
  return { limit, ...(ctx.str("cursor") ? { cursor: ctx.str("cursor") } : {}) };
}

export function thingBody(ctx: RuntimeContext) {
  if (ctx.str("file") && ctx.bool("stdin"))
    throw new Error("Use either --file or --stdin");
  if (ctx.bool("stdin") && process.stdin.isTTY)
    throw new Error("Pipe JSON to --stdin");
  const input = ctx.str("file")
    ? readFileSync(ctx.str("file"), "utf8")
    : ctx.bool("stdin")
      ? readFileSync(0, "utf8")
      : "";
  let fields: Record<string, unknown>;
  try {
    fields = input ? JSON.parse(input) : {};
  } catch {
    throw new Error("Invalid thing JSON. Supply a valid JSON object.");
  }
  if (!fields || Array.isArray(fields) || typeof fields !== "object")
    throw new Error("Input must be an thing field object");
  const allowed = [
    "title",
    "description",
    "tags",
    "status",
    "assigneeId",
    "collaboratorIds",
  ];
  if (Object.keys(fields).some((key) => !allowed.includes(key)))
    throw new Error("Input contains unsupported thing fields");
  for (const key of allowed) {
    const value = ctx.str(key);
    if (value) {
      if (["tags", "collaboratorIds"].includes(key)) {
        try {
          fields[key] = JSON.parse(value);
        } catch {
          throw new Error(`--${key} requires a JSON string array`);
        }
      } else fields[key] = value;
    }
  }
  if (
    fields.assigneeId !== undefined &&
    (fields.assigneeId === null ||
      fields.assigneeId === "null" ||
      typeof fields.assigneeId !== "string" ||
      !fields.assigneeId.trim())
  )
    throw new Error(
      "Assignee must be an active member ID; null is not allowed",
    );
  for (const key of ["tags", "collaboratorIds"]) {
    if (
      fields[key] !== undefined &&
      (!Array.isArray(fields[key]) ||
        !fields[key].every((value: unknown) => typeof value === "string"))
    )
      throw new Error(`${key} must be a string array`);
  }
  if (
    fields.status &&
    !["open", "paused", "done"].includes(String(fields.status))
  )
    throw new Error("Invalid thing status");
  return fields;
}

export type Action = {
  // 事项本体动作不带 resource 层，直接挂在 things 服务下（ae-cli things list/get/...）。
  resource?: "entry" | "asset" | "conversation" | "collaborator";
  command: string;
  risk?: Command["risk"];
  method: "GET" | "POST" | "PATCH" | "DELETE";
  suffix: (ctx: RuntimeContext) => string;
  flags: Flag[];
  body?: (ctx: RuntimeContext) => Record<string, unknown>;
  params?: (ctx: RuntimeContext) => Record<string, unknown>;
  validate?: (ctx: RuntimeContext) => void;
};
const validateAttachmentRole = (ctx: RuntimeContext) => {
  if (ctx.str("role") && ctx.str("role") !== "attachment")
    throw new Error("--role only accepts attachment");
};
const thingId = (ctx: RuntimeContext) => validThingsId(ctx.str("id"));
function sourceBody(ctx: RuntimeContext) {
  if (
    ctx.str("conversationId") &&
    process.env.TE_AGENT_CONVERSATION_ID &&
    ctx.str("conversationId") !== process.env.TE_AGENT_CONVERSATION_ID
  )
    throw new Error(
      "Source conversation must match the current execution conversation",
    );
  const conversationId =
    ctx.str("conversationId") || process.env.TE_AGENT_CONVERSATION_ID;
  return {
    ...(conversationId
      ? { conversationId: validThingsId(conversationId) }
      : {}),
    ...(ctx.str("runId") ? { runId: validThingsId(ctx.str("runId")) } : {}),
  };
}
const actions: Action[] = [
  ...parityActions(validThingsId, pageFlags, pageQuery),
  {
    resource: "asset",
    command: "available",
    method: "GET",
    suffix: () => "/things/assets",
    flags: [...pageFlags],
    params: pageQuery,
  },
  {
    resource: "asset",
    command: "list",
    method: "GET",
    suffix: (ctx) => `/things/${thingId(ctx)}/assets`,
    flags: [idFlag, ...pageFlags],
    params: pageQuery,
  },
  {
    resource: "asset",
    command: "link",
    validate: (ctx) => {
      validateAttachmentRole(ctx);
      if (Boolean(ctx.str("assetId")) === Boolean(ctx.str("path")))
        throw new Error("Specify exactly one of --asset-id or --path");
    },
    method: "POST",
    suffix: (ctx) => `/things/${thingId(ctx)}/assets`,
    flags: [
      idFlag,
      {
        name: "asset-id",
        type: "string",
        desc: "Stable space asset ID",
      },
      {
        name: "path",
        type: "string",
        sensitive: true,
        desc: "Space-relative file path returned by asset available",
      },
      {
        name: "role",
        type: "string",
        desc: "attachment (default; only supported role)",
      },
    ],
    body: (ctx) => ({
      ...(ctx.str("assetId")
        ? { assetId: validThingsId(ctx.str("assetId")) }
        : { path: ctx.str("path") }),
      role: ctx.str("role") || "attachment",
    }),
  },
  {
    resource: "asset",
    command: "unlink",
    method: "DELETE",
    suffix: (ctx) => `/things/${thingId(ctx)}/assets`,
    flags: [
      idFlag,
      {
        name: "asset-id",
        type: "string",
        required: true,
        desc: "Stable space asset ID",
      },
    ],
    body: (ctx) => ({ assetId: validThingsId(ctx.str("assetId")) }),
  },
  {
    resource: "asset",
    command: "publish",
    validate: validateAttachmentRole,
    method: "POST",
    suffix: (ctx) => `/things/${thingId(ctx)}/publish-asset`,
    flags: [
      idFlag,
      {
        name: "conversation-id",
        type: "string",
        desc: "Owned conversation containing the artifact",
      },
      {
        name: "artifact-id",
        type: "string",
        desc: "Verified file artifact ID",
      },
      {
        name: "file-token",
        type: "string",
        sensitive: true,
        desc: "Verified directory child file token",
      },
      {
        name: "source-path",
        type: "string",
        sensitive: true,
        desc: "Absolute delivered file path in this conversation sandbox artifacts directory",
      },
      {
        name: "run-id",
        type: "string",
        desc: "Verified execution ID, required with --source-path",
      },
      {
        name: "destination-path",
        type: "string",
        sensitive: true,
        desc: "Existing folder within space documents",
      },
      {
        name: "role",
        type: "string",
        desc: "attachment (default; only supported role)",
      },
      {
        name: "confirm-share",
        type: "boolean",
        desc: "User explicitly authorized making this artifact visible to all space members",
      },
    ],
    body: (ctx) => {
      if (!ctx.bool("confirmShare"))
        throw new Error(
          "Explicit sharing authorization is required: --confirm-share",
        );
      if (
        [
          ctx.str("artifactId"),
          ctx.str("fileToken"),
          ctx.str("sourcePath"),
        ].filter(Boolean).length !== 1
      )
        throw new Error(
          "Specify exactly one of --artifact-id, --file-token or --source-path",
        );
      if (Boolean(ctx.str("sourcePath")) !== Boolean(ctx.str("runId")))
        throw new Error("--source-path and --run-id must be provided together");
      return {
        ...sourceBody(ctx),
        ...(ctx.str("artifactId")
          ? { artifactId: validThingsId(ctx.str("artifactId")) }
          : {}),
        ...(ctx.str("fileToken") ? { fileToken: ctx.str("fileToken") } : {}),
        ...(ctx.str("sourcePath") ? { sourcePath: ctx.str("sourcePath") } : {}),
        destinationPath: ctx.str("destinationPath") || null,
        role: ctx.str("role") || "attachment",
        confirmShare: true,
      };
    },
  },

  {
    command: "conversations",
    method: "GET",
    suffix: (ctx) => `/things/${thingId(ctx)}/conversations`,
    flags: [idFlag, ...pageFlags],
    params: pageQuery,
  },
  {
    command: "link-conversation",
    method: "POST",
    suffix: (ctx) => `/things/${thingId(ctx)}/conversations`,
    flags: [
      idFlag,
      {
        name: "conversation-id",
        type: "string",
        required: true,
        desc: "Owned conversation to reference; does not replace its primary thing",
      },
    ],
    body: (ctx) => ({
      conversationId: validThingsId(ctx.str("conversationId")),
    }),
  },
  {
    command: "context",
    method: "GET",
    suffix: (ctx) => `/things/${thingId(ctx)}/context`,
    flags: [
      idFlag,
      {
        name: "run-id",
        type: "string",
        desc: "Read this execution snapshot; omitted reads live context",
      },
    ],
    params: (ctx) =>
      ctx.str("runId") ? { runId: validThingsId(ctx.str("runId")) } : {},
  },
  {
    command: "list",
    method: "GET",
    suffix: () => "/things",
    flags: [
      ...pageFlags,
      {
        name: "query",
        type: "string",
        sensitive: true,
        desc: "Search title and description",
      },
      { name: "status", type: "string", desc: "Filter thing status" },
      { name: "assignee-id", type: "string", desc: "Filter assignee" },
    ],
    params: (ctx) => ({
      ...pageQuery(ctx),
      ...Object.fromEntries(
        ["query", "status", "assigneeId"].flatMap((k) =>
          ctx.str(k) ? [[k, ctx.str(k)]] : [],
        ),
      ),
    }),
  },
  {
    command: "get",
    method: "GET",
    suffix: (ctx) => `/things/${thingId(ctx)}`,
    flags: [idFlag],
  },
  {
    command: "create",
    method: "POST",
    suffix: () => "/things",
    flags: thingFlags,
    body: (ctx) => {
      const fields = thingBody(ctx);
      if (
        typeof fields.title !== "string" ||
        !fields.title.trim() ||
        typeof fields.description !== "string" ||
        !fields.description.trim()
      )
        throw new Error("Thing creation requires title and description");
      return fields;
    },
  },
  {
    command: "update",
    method: "PATCH",
    suffix: (ctx) => `/things/${thingId(ctx)}`,
    flags: [idFlag, versionFlag, ...thingFlags],
    body: (ctx) => ({
      ...thingBody(ctx),
      expectedVersion: ctx.num("expectedVersion"),
    }),
  },
  ...["archive", "restore"].map((command): Action => ({
    command,
    method: "POST",
    suffix: (ctx) => `/things/${thingId(ctx)}/${command}`,
    flags: [idFlag, versionFlag],
    body: (ctx) => ({ expectedVersion: ctx.num("expectedVersion") }),
  })),
  {
    command: "delete",
    method: "DELETE",
    suffix: (ctx) => `/things/${thingId(ctx)}`,
    flags: [
      idFlag,
      versionFlag,
      {
        name: "confirm-delete",
        type: "boolean",
        desc: "Confirm irreversible deletion of the thing and all links; keep conversations, messages and files",
      },
    ],
    validate: (ctx) => {
      if (!ctx.bool("confirmDelete"))
        throw new Error(
          "Explicit deletion confirmation is required: --confirm-delete",
        );
    },
    body: (ctx) => ({
      expectedVersion: ctx.num("expectedVersion"),
      confirmDelete: true,
    }),
  },
  {
    resource: "entry",
    command: "list",
    method: "GET",
    suffix: (ctx) => `/things/${thingId(ctx)}/entries`,
    flags: [idFlag, ...pageFlags],
    params: pageQuery,
  },
  {
    resource: "entry",
    command: "append",
    method: "POST",
    suffix: (ctx) => `/things/${thingId(ctx)}/entries`,
    flags: [
      idFlag,
      {
        name: "content",
        type: "string",
        sensitive: true,
        desc: "Entry content",
      },
      {
        name: "file",
        type: "string",
        sensitive: true,
        desc: "UTF-8 text file",
      },
      { name: "stdin", type: "boolean", desc: "Read text from stdin" },
      {
        name: "type",
        type: "string",
        desc: "url | note | progress; omitted auto-detects URL or note",
      },
      {
        name: "title",
        type: "string",
        sensitive: true,
        desc: "Entry title, at most 200 characters",
      },
    ],
    validate: (ctx) => {
      if (
        ctx.str("type") &&
        !["note", "url", "progress"].includes(ctx.str("type"))
      )
        throw new Error("Entry type must be note, url or progress");
      if (ctx.str("title") && !ctx.str("title").trim())
        throw new Error("Entry title must not be blank");
      if (ctx.str("title").trim().length > 200)
        throw new Error("Entry title exceeds 200 characters");
    },
    body: (ctx) => {
      const sources = [
        Boolean(ctx.str("content")),
        Boolean(ctx.str("file")),
        ctx.bool("stdin"),
      ].filter(Boolean).length;
      if (sources !== 1)
        throw new Error("Specify exactly one of --content, --file or --stdin");
      if (ctx.bool("stdin") && process.stdin.isTTY)
        throw new Error("Pipe text to --stdin");
      return {
        ...(ctx.str("type") ? { type: ctx.str("type") } : {}),
        ...(ctx.str("title") ? { title: ctx.str("title") } : {}),
        content:
          ctx.str("content") || readFileSync(ctx.str("file") || 0, "utf8"),
      };
    },
  },
];

export const thingsCommands: Command[] = actions.map((action) => ({
  service: "things",
  resource: action.resource,
  command: action.command,
  description: action.resource
    ? `${action.command} a workspace thing ${action.resource} (Transitional TE REST)`
    : `${action.command} a workspace thing (Transitional TE REST)`,
  risk:
    action.risk ??
    (action.method === "GET"
      ? "read"
      : action.method === "DELETE"
        ? "high-risk-write"
        : "write"),
  flags: [
    ...targetFlags,
    ...action.flags,
    ...(action.method === "GET" ? [] : [commandFlag]),
  ],
  validate: (ctx) => {
    thingsTarget(ctx);
    action.suffix(ctx);
    action.params?.(ctx);
    action.validate?.(ctx);
  },
  dryRun: (ctx) => {
    action.validate?.(ctx);
    return {
      method: action.method,
      url: thingsUrl(
        ctx,
        `agent-spaces/${thingsTarget(ctx).agentSpaceId ?? "{resolved-space-id}"}${action.suffix(ctx)}`,
      ),
      params: {
        target: thingsTarget(ctx),
        resolveTarget: thingsUrl(ctx, "target"),
        ...(action.params ? { query: "[REDACTED]" } : {}),
      },
      ...(action.body
        ? {
            body: {
              payload: "[REDACTED]",
              commandId: ctx.str("commandId") || "{generated-uuid}",
            },
          }
        : {}),
    };
  },
  execute: async (ctx) => {
    action.validate?.(ctx);
    const body = action.body?.(ctx);
    return requestThings(
      ctx,
      action.method,
      `${await root(ctx)}${action.suffix(ctx)}${query(action.params?.(ctx) ?? {})}`,
      body
        ? { ...body, commandId: ctx.str("commandId") || randomUUID() }
        : undefined,
    );
  },
}));

const scopeFlags: Flag[] = [
  {
    name: "thing-ids",
    type: "string",
    sensitive: true,
    desc: "Explicit comma-separated thing IDs; cannot combine with assignee scope",
  },
  { name: "assignee-id", type: "string", desc: "Assignee scope" },
  {
    name: "from",
    type: "string",
    desc: "Inclusive start, ISO timestamp with timezone",
  },
  {
    name: "to",
    type: "string",
    desc: "Exclusive end, ISO timestamp with timezone",
  },
  {
    name: "time-zone",
    type: "string",
    desc: "Calendar timezone, default Asia/Shanghai",
  },
];
function explicitIds(ctx: RuntimeContext) {
  const ids = [
    ...new Set(
      ctx
        .str("thingIds")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(validThingsId),
    ),
  ];
  if (ids.length > 1000)
    throw new Error("At most 1000 explicit thing IDs are supported");
  if (ids.length && ctx.str("assigneeId"))
    throw new Error("Use explicit IDs or assignee scope");
  return ids;
}
thingsCommands.push(
  ...["+detail", "+digest"].map((command): Command => ({
    service: "things",
    command,
    description:
      command === "+detail"
        ? "Collect thing facts and complete timeline with collection boundaries"
        : "Collect scoped thing facts and period changes for review or summaries",
    risk: "read",
    flags: [...targetFlags, ...(command === "+detail" ? [idFlag] : scopeFlags)],
    validate: (ctx) => {
      thingsTarget(ctx);
      if (command === "+detail") thingId(ctx);
      else {
        thingsWindow(ctx);
        explicitIds(ctx);
      }
    },
    dryRun: (ctx) => ({
      method: "GET",
      url: thingsUrl(ctx, "target"),
      params: {
        target: thingsTarget(ctx),
        operation: command,
        scope: "[REDACTED]",
        pagination: true,
      },
    }),
    execute: async (ctx) =>
      command === "+detail"
        ? collectThingDetail(ctx, await root(ctx), thingId(ctx))
        : collectThingDigest(ctx, await root(ctx), explicitIds(ctx)),
  })),
);
export default thingsCommands;
