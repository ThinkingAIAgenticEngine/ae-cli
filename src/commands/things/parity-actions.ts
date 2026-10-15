import { readFileSync } from "node:fs";
import type { Flag, RuntimeContext } from "../../framework/types.js";
import type { Action } from "./index.js";

const stringFlag = (name: string, desc: string, required = false): Flag => ({
  name,
  type: "string",
  desc,
  required,
});
const conversationFlag = stringFlag(
  "conversation-id",
  "Owned conversation ID",
  true,
);
const contentFlags: Flag[] = [
  { ...stringFlag("content", "Text content"), sensitive: true },
  { ...stringFlag("file", "UTF-8 text file"), sensitive: true },
  { name: "stdin", type: "boolean", desc: "Read text from stdin" },
];
function content(ctx: RuntimeContext) {
  if (
    [
      Boolean(ctx.str("content")),
      Boolean(ctx.str("file")),
      ctx.bool("stdin"),
    ].filter(Boolean).length !== 1
  )
    throw new Error("Specify exactly one of --content, --file or --stdin");
  if (ctx.bool("stdin") && process.stdin.isTTY)
    throw new Error("Pipe text to --stdin");
  return ctx.str("content") || readFileSync(ctx.str("file") || 0, "utf8");
}
export function parityActions(
  id: (value: string) => string,
  pageFlags: Flag[],
  pageQuery: (ctx: RuntimeContext) => Record<string, unknown>,
): Action[] {
  const thingFlag = stringFlag("id", "Thing ID", true);
  const conversationPath = (ctx: RuntimeContext) =>
    `/things/conversation/${id(ctx.str("conversationId"))}`;
  return [
    ...["members", "options"].map((command): Action => ({
        command,
      method: "GET",
      suffix: () => `/things/${command}`,
      flags: [
        ...pageFlags,
        ...(command === "options"
          ? [stringFlag("query", "Search candidates")]
          : []),
      ],
      params: (ctx) => ({
        ...pageQuery(ctx),
        ...(command === "options" && ctx.str("query")
          ? { query: ctx.str("query") }
          : {}),
      }),
    })),
    ...["add", "remove"].map((command): Action => ({
      resource: "collaborator",
      command,
      method: command === "remove" ? "DELETE" : "POST",
      suffix: (ctx) => `/things/${id(ctx.str("id"))}/collaborators`,
      flags: [thingFlag, stringFlag("user-id", "Space member ID", true)],
      body: (ctx) => ({ userId: id(ctx.str("userId")) }),
    })),
    {
      resource: "entry",
      command: "update",
      method: "PATCH",
      suffix: (ctx) =>
        `/things/${id(ctx.str("id"))}/entries/${id(ctx.str("entryId"))}`,
      flags: [
        thingFlag,
        stringFlag("entry-id", "Entry ID", true),
        stringFlag(
          "expected-updated-at",
          "Timestamp from the latest entry read",
          true,
        ),
        ...contentFlags,
        { ...stringFlag("title", "Entry title"), sensitive: true },
        { name: "clear-title", type: "boolean", desc: "Clear the entry title" },
        stringFlag("type", "note | url | progress"),
      ],
      validate: (ctx) => {
        if (ctx.str("title") && ctx.bool("clearTitle"))
          throw new Error("Use --title or --clear-title");
        if (
          ctx.str("type") &&
          !["note", "url", "progress"].includes(ctx.str("type"))
        )
          throw new Error("Entry type must be note, url or progress");
        if (ctx.str("title") && !ctx.str("title").trim())
          throw new Error("Entry title must not be blank");
        if (ctx.str("title").trim().length > 200)
          throw new Error("Entry title exceeds 200 characters");
        if (
          !["content", "file", "title", "type"].some((key) => ctx.str(key)) &&
          !ctx.bool("stdin") &&
          !ctx.bool("clearTitle")
        )
          throw new Error("Provide at least one entry field to update");
      },
      body: (ctx) => ({
        ...(ctx.str("content") || ctx.str("file") || ctx.bool("stdin")
          ? { content: content(ctx) }
          : {}),
        ...(ctx.bool("clearTitle")
          ? { title: null }
          : ctx.str("title")
            ? { title: ctx.str("title") }
            : {}),
        ...(ctx.str("type") ? { type: ctx.str("type") } : {}),
        expectedUpdatedAt: ctx.str("expectedUpdatedAt"),
      }),
    },
    {
      resource: "conversation",
      command: "get",
      method: "GET",
      suffix: (ctx) => `${conversationPath(ctx)}/snapshot`,
      flags: [conversationFlag],
    },
    {
      resource: "conversation",
      command: "primary",
      method: "GET",
      suffix: conversationPath,
      flags: [conversationFlag],
    },
    ...["bind", "unbind"].map((command): Action => ({
      resource: "conversation",
      command,
      method: "POST",
      suffix: conversationPath,
      risk: command === "unbind" ? "high-risk-write" : "write",
      flags: [conversationFlag, ...(command === "bind" ? [thingFlag] : [])],
      body: (ctx) => ({
        primaryThingId: command === "bind" ? id(ctx.str("id")) : null,
      }),
    })),
    {
        command: "from-message",
      method: "POST",
      suffix: () => "/things/from-message",
      flags: [
        conversationFlag,
        stringFlag("message-id", "Source message ID", true),
        ...contentFlags,
        stringFlag("id", "Existing thing ID; omit to create from --title"),
        { ...stringFlag("title", "New thing title"), sensitive: true },
        stringFlag(
          "entry-type",
          "note | progress; only with --id (default: note)",
        ),
      ],
      validate: (ctx) => {
        if (Boolean(ctx.str("id")) === Boolean(ctx.str("title")))
          throw new Error("Specify either --id or --title");
        if (ctx.str("title") && ctx.str("entryType"))
          throw new Error(
            "--entry-type is only supported with --id, not --title",
          );
      },
      body: (ctx) => {
        return {
          conversationId: id(ctx.str("conversationId")),
          messageId: id(ctx.str("messageId")),
          content: content(ctx),
          ...(ctx.str("entryType") ? { entryType: ctx.str("entryType") } : {}),
          ...(ctx.str("id")
            ? { thingId: id(ctx.str("id")) }
            : { fields: { title: ctx.str("title") } }),
        };
      },
    },
  ];
}
