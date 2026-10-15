import assert from "node:assert/strict";
import { logger } from "../src/core/logger.js";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  thingsCommands,
  thingsTarget,
  thingBody,
} from "../src/commands/things/index.js";
import { clearCliToken } from "../src/core/cli-token.js";
import type { RuntimeContext } from "../src/framework/types.js";
const host = "http://things-test.invalid";
function ctx(v: Record<string, unknown>): RuntimeContext {
  return {
    str: (k) => (typeof v[k] === "string" ? String(v[k]) : ""),
    num: (k) => Number(v[k]),
    optionalNum: (k) => (v[k] === undefined ? undefined : Number(v[k])),
    bool: (k) => v[k] === true,
    json: (k) => v[k],
    list: () => [],
    api: async () => {
      throw Error("Unused");
    },
    communityReport: async () => {
      throw Error("Unused");
    },
    localDataUpload: async () => {
      throw Error("Unused");
    },
    querySql: async () => {
      throw Error("Unused");
    },
    queryReportData: async () => {
      throw Error("Unused");
    },
    token: async () => "",
    host: () => host,
    mcpUrl: () => undefined,
    service: () => "things",
    out: () => {},
  };
}
const command = (resource: string | undefined, action: string) =>
  thingsCommands.find((c) => c.resource === resource && c.command === action)!;
const saved = Object.fromEntries(
  [
    "SANDBOX_RUNTIME_ROOT",
    "TE_AGENT_CONVERSATION_ID",
    "TE_CLAUDE_BASE_PATH",
    "AE_API_PREFIX",
  ].map((k) => [k, process.env[k]]),
);
const originalFetch = globalThis.fetch;
const temp = mkdtempSync(join(tmpdir(), "ae-things-test-"));
try {
  delete process.env.TE_AGENT_CONVERSATION_ID;
  assert.throws(() => thingsTarget(ctx({})), /agent-space-id/);
  assert.throws(
    () =>
      command(undefined, "get").validate!(
        ctx({ agentSpaceId: "space-a", id: "../private" }),
      ),
    /identifier/,
  );
  assert.throws(
    () =>
      command(undefined, "list").validate!(
        ctx({ agentSpaceId: "space-a", limit: 101 }),
      ),
    /100/,
  );
  assert.throws(() => thingBody(ctx({ status: "closed" })), /status/);
  assert.throws(() => thingBody(ctx({ assigneeId: "null" })), /Assignee/);
  for (const action of ["claim", "release", "checkpoint", "handoff"])
    assert.equal(command(undefined, action), undefined);
  assert.equal(command(undefined, "claims"), undefined);
  assert.throws(
    () =>
      command("entry", "update").validate!(
        ctx({
          agentSpaceId: "space-a",
          id: "thing-a",
          entryId: "entry-a",
          expectedUpdatedAt: "2026-09-17T00:00:00Z",
        }),
      ),
    /at least one/,
  );
  assert.throws(
    () =>
      command("entry", "append").validate!(
        ctx({ agentSpaceId: "space-a", id: "thing-a", type: "text" }),
      ),
    /Entry type/,
  );

  process.env.TE_AGENT_CONVERSATION_ID = "conversation-a";
  assert.deepEqual(thingsTarget(ctx({ agentSpaceId: "space-a" })), {
    agentSpaceId: "space-a",
    conversationId: "conversation-a",
  });
  const preview = await command(undefined, "create").dryRun!(
    ctx({
      agentSpaceId: "space-a",
      title: "PRIVATE TITLE",
      file: "/file-must-not-be-opened",
    }),
  );
  assert.ok(!JSON.stringify(preview).includes("PRIVATE TITLE"));
  assert.ok(!JSON.stringify(preview).includes("file-must-not-be-opened"));
  const file = join(temp, "thing.json");
  writeFileSync(
    file,
    JSON.stringify({
      title: "long input",
      assigneeId: "member-1",
      description: "body",
    }),
  );
  assert.equal(thingBody(ctx({ file })).description, "body");
  writeFileSync(file, JSON.stringify({ title: "goal", actorId: "forged" }));
  assert.throws(() => thingBody(ctx({ file })), /unsupported/);
  writeFileSync(file, "CONFIDENTIAL_INVALID_JSON");
  assert.throws(
    () => thingBody(ctx({ file })),
    (error) =>
      error instanceof Error &&
      !error.message.includes("CONFIDENTIAL") &&
      error.message.includes("Invalid thing JSON"),
  );
  mkdirSync(join(temp, ".ae-config"));
  writeFileSync(
    join(temp, ".ae-config/cli-token.json"),
    JSON.stringify({ url: host, token: "cli_contract_fixture" }),
  );
  process.env.SANDBOX_RUNTIME_ROOT = temp;
  delete process.env.TE_CLAUDE_BASE_PATH;
  delete process.env.AE_API_PREFIX;
  clearCliToken(host);
  const requests: { url: string; headers: Headers; body?: string; method?: string }[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push({
      method: init?.method,
      url: String(input),
      headers: new Headers(init?.headers),
      body: init?.body as string | undefined,
    });
    return new Response(
      JSON.stringify({
        ok: true,
        data: String(input).includes("/target?")
          ? { agentSpaceId: "space-a" }
          : { id: "thing-a", version: 1, changed: true },
      }),
    );
  };
  const commandId = "07f335ef-cef4-4522-bc79-765963c30154";
  for (const [resource, name, values, message] of [
    [
      "asset",
      "link",
      { id: "thing-a", assetId: "asset-a", role: "deliverable" },
      /attachment/,
    ],
    [
      "asset",
      "publish",
      {
        id: "thing-a",
        artifactId: "artifact-a",
        confirmShare: true,
        role: "deliverable",
      },
      /attachment/,
    ],
    [
      undefined,
      "from-message",
      {
        conversationId: "conversation-a",
        messageId: "message-a",
        title: "goal",
        content: "body",
        entryType: "progress",
      },
      /entry-type.*--id/,
    ],
  ] as const) {
    const definition = command(resource, name);
    const input = ctx({ agentSpaceId: "space-a", ...values });
    const count = requests.length;
    assert.throws(() => definition.validate!(input), message);
    await assert.rejects(async () => definition.dryRun!(input), message);
    await assert.rejects(definition.execute(input), message);
    assert.equal(requests.length, count);
  }

  await command(undefined, "create").execute(
    ctx({
      agentSpaceId: "space-a",
      commandId,
      title: "goal",
      description: "Investigate goal",
    }),
  );
  const businessRequests = requests.filter((r) =>
    r.url.includes("/api/cli/things/"),
  );
  assert.equal(businessRequests.length, 2);
  assert.match(
    businessRequests[0].url,
    /\/things\/v1\/target\?agentSpaceId=space-a&conversationId=conversation-a$/,
  );
  assert.match(
    businessRequests[1].url,
    /\/things\/v1\/agent-spaces\/space-a\/things$/,
  );
  assert.equal(
    businessRequests[1].headers.get("cli-token"),
    "cli_contract_fixture",
  );
  assert.equal(businessRequests[1].headers.get("Authorization"), null);
  assert.deepEqual(JSON.parse(businessRequests[1].body!), {
    title: "goal",
    description: "Investigate goal",
    commandId,
  });
  assert.ok(
    command(undefined, "context").flags?.some((flag) => flag.name === "run-id"),
  );
  for (const patch of [
    { title: "New title" },
    { clearTitle: true },
    { type: "note" },
  ]) {
    await command("entry", "update").execute(
      ctx({
        agentSpaceId: "space-a",
        id: "thing-a",
        entryId: "entry-a",
        expectedUpdatedAt: "2026-09-17T00:00:00Z",
        ...patch,
      }),
    );
    const payload = JSON.parse(requests.at(-1)!.body!);
    assert.equal(payload.content, undefined);
    if ("clearTitle" in patch) assert.equal(payload.title, null);
    else if ("title" in patch) assert.equal(payload.title, patch.title);
    else assert.equal(payload.type, patch.type);
  }
  await command("entry", "append").execute(
    ctx({
      agentSpaceId: "space-a",
      id: "thing-a",
      content: "https://example.com",
      title: "A link",
    }),
  );
  assert.equal(JSON.parse(requests.at(-1)!.body!).type, undefined);
  assert.equal(JSON.parse(requests.at(-1)!.body!).title, "A link");
  await command(undefined, "context").execute(
    ctx({ agentSpaceId: "space-a", id: "thing-a", runId: "run-a" }),
  );
  assert.match(requests.at(-1)!.url, /things\/thing-a\/context\?runId=run-a$/);
  await command(undefined, "context").execute(
    ctx({ agentSpaceId: "space-a", id: "thing-a" }),
  );
  assert.match(requests.at(-1)!.url, /things\/thing-a\/context$/);
  assert.throws(
    () =>
      command(undefined, "context").validate!(
        ctx({ agentSpaceId: "space-a", id: "thing-a", runId: "../other" }),
      ),
    /identifier/,
  );
  await assert.rejects(
    command("asset", "publish").execute(
      ctx({
        agentSpaceId: "space-a",
        id: "thing-a",
        artifactId: "artifact-a",
        commandId,
      }),
    ),
    /authorization/,
  );
  await command("asset", "publish").execute(
    ctx({
      agentSpaceId: "space-a",
      id: "thing-a",
      artifactId: "artifact-a",
      confirmShare: true,
      commandId,
    }),
  );
  assert.deepEqual(JSON.parse(requests.at(-1)!.body!), {
    conversationId: "conversation-a",
    artifactId: "artifact-a",
    confirmShare: true,
    role: "attachment",
    destinationPath: null,
    commandId,
  });
  assert.match(requests.at(-1)!.url, /publish-asset$/);
  await command("asset", "publish").execute(
    ctx({
      agentSpaceId: "space-a",
      id: "thing-a",
      sourcePath: "/artifacts/new.html",
      runId: "run-a",
      confirmShare: true,
      commandId,
    }),
  );
  assert.deepEqual(JSON.parse(requests.at(-1)!.body!), {
    conversationId: "conversation-a",
    runId: "run-a",
    sourcePath: "/artifacts/new.html",
    confirmShare: true,
    role: "attachment",
    destinationPath: null,
    commandId,
  });
  await assert.rejects(
    command("asset", "publish").execute(
      ctx({
        agentSpaceId: "space-a",
        id: "thing-a",
        sourcePath: "/artifacts/new.html",
        confirmShare: true,
        commandId,
      }),
    ),
    /provided together/,
  );
  await command("asset", "link").execute(
    ctx({
      agentSpaceId: "space-a",
      id: "thing-a",
      path: "nested/new.html",
      commandId,
    }),
  );
  assert.deepEqual(JSON.parse(requests.at(-1)!.body!), {
    path: "nested/new.html",
    role: "attachment",
    commandId,
  });
  assert.equal(command(undefined, "delete").risk, "high-risk-write");
  assert.throws(
    () =>
      command(undefined, "delete").validate!(
        ctx({ agentSpaceId: "space-a", id: "thing-a" }),
      ),
    /confirm-delete/,
  );
  await command(undefined, "delete").execute(
    ctx({
      agentSpaceId: "space-a",
      id: "thing-a",
      expectedVersion: 3,
      confirmDelete: true,
      commandId,
    }),
  );
  assert.equal(requests.at(-1)!.method, "DELETE");
  assert.deepEqual(JSON.parse(requests.at(-1)!.body!), {
    expectedVersion: 3,
    confirmDelete: true,
    commandId,
  });
  const privateFilePreview = await command("asset", "publish").dryRun!(
    ctx({
      agentSpaceId: "space-a",
      id: "thing-a",
      fileToken: "PRIVATE-FILE-TOKEN",
    }),
  );
  assert.ok(!JSON.stringify(privateFilePreview).includes("PRIVATE-FILE-TOKEN"));
  const logged: string[] = [];
  const oldInfo = logger.info;
  try {
    logger.info = (message: string) => {
      logged.push(message);
    };
    for (const [resource, action, values] of [
      [
        undefined,
        "from-message",
        { title: "PRIVATE TITLE", content: "PRIVATE CONTENT" },
      ],
    ] as const) {
      const definition = command(resource, action);
      logger.command(
        ["things", resource, action].filter(Boolean).join(" "),
        values,
        definition.flags
          ?.filter((flag) => flag.sensitive)
          .map((flag) => flag.name),
      );
    }
    assert.ok(logged.every((line) => !line.includes("PRIVATE")));
    assert.ok(logged.every((line) => line.includes("***")));
  } finally {
    logger.info = oldInfo;
  }
  assert.equal(command("conversation", "unbind").risk, "high-risk-write");
  assert.equal(
    command(undefined, "from-message").flags?.find(
      (flag) => flag.name === "title",
    )?.sensitive,
    true,
  );
  assert.equal(command("draft", "create"), undefined);
  assert.equal(command("group", "list"), undefined);
  await command("collaborator", "add").execute(
    ctx({
      agentSpaceId: "space-a",
      id: "thing-a",
      userId: "member-a",
      commandId,
    }),
  );
  assert.deepEqual(JSON.parse(requests.at(-1)!.body!), {
    userId: "member-a",
    commandId,
  });
  await command("conversation", "bind").execute(
    ctx({
      agentSpaceId: "space-a",
      id: "thing-a",
      conversationId: "conversation-a",
      commandId,
    }),
  );
  assert.deepEqual(JSON.parse(requests.at(-1)!.body!), {
    primaryThingId: "thing-a",
    commandId,
  });
  await command("conversation", "unbind").execute(
    ctx({
      agentSpaceId: "space-a",
      conversationId: "conversation-a",
      commandId,
    }),
  );
  assert.deepEqual(JSON.parse(requests.at(-1)!.body!), {
    primaryThingId: null,
    commandId,
  });
  assert.equal(command("conversation", "start"), undefined);
  assert.deepEqual(
    thingBody(
      ctx({
        tags: '["tag"]',
        collaboratorIds: "[]",
        assigneeId: "member-1",
        status: "paused",
      }),
    ),
    {
      tags: ["tag"],
      collaboratorIds: [],
      assigneeId: "member-1",
      status: "paused",
    },
  );
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ ok: true, data: { agentSpaceId: "other-space" } }),
    );
  await assert.rejects(
    command(undefined, "get").execute(
      ctx({ agentSpaceId: "space-a", id: "thing-a" }),
    ),
    /conflicting/,
  );
  globalThis.fetch = async (input) =>
    String(input).includes("target?")
      ? new Response(
          JSON.stringify({ ok: true, data: { agentSpaceId: "space-a" } }),
        )
      : new Response(
          JSON.stringify({
            ok: false,
            error: {
              code: "THING_VERSION_CONFLICT",
              message: "不应回显的消息",
            },
          }),
          { status: 409 },
        );
  await assert.rejects(
    command(undefined, "update").execute(
      ctx({
        agentSpaceId: "space-a",
        id: "thing-a",
        expectedVersion: 1,
        title: "next",
        commandId,
      }),
    ),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes("Read it again") &&
      "code" in error &&
      error.code === "THING_VERSION_CONFLICT",
  );

  for (const reason of [
    "Archived thing",
    "Unavailable space",
    "Immutable operation log",
  ]) {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: { code: "THING_READ_ONLY", message: reason },
        }),
        { status: 409 },
      );
    await assert.rejects(
      command(undefined, "get").execute(
        ctx({ agentSpaceId: "space-a", id: "thing-a" }),
      ),
      (error: unknown) =>
        error instanceof Error &&
        /read-only/.test(error.message) &&
        !/archived|restore/i.test(error.message) &&
        "code" in error &&
        error.code === "THING_READ_ONLY",
    );
  }
  assert.equal(
    new Set(thingsCommands.map((c) => `${c.resource}:${c.command}`)).size,
    thingsCommands.length,
  );
  const timeline = Array.from({ length: 215 }, (_, i) => ({
    id: `entry-${i}`,
    type: "note",
    content: "business fixture",
    createdAt: "2026-09-08T00:00:00Z",
  }));
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    // 路径里 things 出现两次（服务段 /cli/things/v1 与资源段 /things/<id>），必须锚定到空间下的资源段。
    const id = url.pathname.match(/agent-spaces\/[^/]+\/things\/([^/]+)/)?.[1];
    let data: unknown;
    if (url.pathname.endsWith("/target")) data = { agentSpaceId: "space-a" };
    else if (url.pathname.endsWith("/things"))
      data = {
        items: [{ id: "thing-a" }, { id: "thing-b" }, { id: "thing-c" }],
        nextCursor: null,
      };
    else if (url.pathname.endsWith("/entries")) {
      const offset = Number(url.searchParams.get("cursor") ?? 0);
      data = {
        items: timeline.slice(offset, offset + 100),
        nextCursor:
          offset + 100 < timeline.length ? String(offset + 100) : null,
      };
    } else if (url.pathname.endsWith("/assets"))
      data = { items: [], nextCursor: null };
    else if (url.pathname.endsWith("/context"))
      data = { thing: { version: id === "thing-b" ? 2 : 1 } };
    else
      data = {
        id,
        version: 1,
        title: "fixture",
        status: id === "thing-b" ? "done" : "open",
        archivedAt: id === "thing-c" ? "2026-09-01T00:00:00Z" : null,
        createdAt: "2026-08-01T00:00:00Z",
      };
    return new Response(JSON.stringify({ ok: true, data }));
  };
  const detail = (await command(undefined, "+detail").execute(
    ctx({ agentSpaceId: "space-a", id: "thing-a" }),
  )) as { fetchedCount: number; truncated: boolean };
  assert.equal(detail.fetchedCount, 216);
  assert.equal(detail.truncated, false);
  const digest = (await command(undefined, "+digest").execute(
    ctx({ agentSpaceId: "space-a" }),
  )) as {
    counts: Record<string, number>;
    archivedCount: number;
    consistency: string;
    items: { baseline: unknown }[];
  };
  assert.deepEqual(digest.counts, {
    open: 1,
    paused: 0,
    done: 1,
  });
  assert.equal(digest.archivedCount, 1);
  assert.equal("hierarchy" in digest, false);
  assert.equal(digest.consistency, "changed_during_collection");
  assert.equal(digest.items[1].baseline, null);
  console.log(
    "things command contract: PASS (target, flags, JSON, dry-run, token transport, error code)",
  );
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  clearCliToken(host);
  rmSync(temp, { recursive: true, force: true });
}
