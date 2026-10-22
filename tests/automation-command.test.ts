import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  automationCommands,
  configuration,
  waitForRun,
} from "../src/commands/automation/index.ts";
import { setCliTokenManual } from "../src/core/cli-token.ts";
import teAgentCommands from "../src/commands/te-agent/index.ts";
import type { RuntimeContext } from "../src/framework/types.ts";
import { canPromptForConfirmation } from "../src/framework/runner.ts";

function context(values: Record<string, unknown> = {}): RuntimeContext {
  return {
    str: (k) => (values[k] === undefined ? "" : String(values[k])),
    num: (k) => Number(values[k]),
    optionalNum: (k) =>
      values[k] === undefined ? undefined : Number(values[k]),
    bool: (k) => values[k] === true,
    json: (k) => values[k],
    list: () => [],
    host: () => "https://automation-test.example",
    service: () => "automation",
    token: async () => "test",
    mcpUrl: () => undefined,
    out: async () => {},
    api: async () => {},
    communityReport: async () => {},
    localDataUpload: async () => {},
    querySql: async () => {},
    queryReportData: async () => {},
  };
}
function command(name: string, resource?: string) {
  return automationCommands.find(
    (c) => c.command === name && c.resource === resource,
  )!;
}

test("configuration preserves false, null, empty arrays and rejects cross-target fields", () => {
  assert.deepEqual(
    configuration(
      context({
        targetType: "agent",
        model: "null",
        reuseConversation: false,
        clearMessage: true,
      }),
      false,
    ),
    { model: null, reuseConversation: false, message: "" },
  );
  assert.deepEqual(
    configuration(
      context({
        targetType: "team",
        scope: null,
        channels: [],
        feishuChatId: "null",
      }),
      false,
    ),
    { scopeJson: null, channels: [], feishuChatId: null },
  );
  assert.throws(
    () => configuration(context({ targetType: "team", model: "m" }), false),
    /not applicable/,
  );
  assert.throws(
    () =>
      configuration(
        context({
          targetType: "agent",
          agentId: "a",
          teamId: "t",
          name: "A",
          triggerType: "manual",
        }),
        true,
      ),
    /only/,
  );
});
test("all frequencies and manual creation validate before normal or dry-run transport", async () => {
  const original = globalThis.fetch;
  setCliTokenManual("cli_test_automation", "https://automation-test.example");
  globalThis.fetch = async () => Response.json({ dryRun: true, valid: true });
  try {
    for (const schedule of [
      { scheduleKind: "hourly", minute: 0 },
      { scheduleKind: "daily", time: "09:00" },
      { scheduleKind: "weekly", time: "14:35", weekday: 0 },
      { scheduleKind: "monthly", time: "14:35", dayOfMonth: 28 },
      { triggerType: "manual" },
    ]) {
      const ctx = context({
        targetType: "agent",
        agentId: "a",
        name: "A",
        ...schedule,
      });
      command("create").validate!(ctx);
      assert.equal(
        (await command("create").dryRun!(ctx)).request.method,
        "POST",
      );
    }
  } finally {
    globalThis.fetch = original;
  }
  const invalid = context({
    targetType: "agent",
    agentId: "a",
    name: "A",
    scheduleKind: "monthly",
    time: "09:00",
    dayOfMonth: 32,
  });
  assert.throws(() => command("create").validate!(invalid), /1 to 31/);
  await assert.rejects(() => command("create").dryRun!(invalid), /1 to 31/);
  assert.throws(
    () =>
      configuration(
        context({ targetType: "team", teamId: "t", name: "T" }),
        true,
      ),
    /requires a schedule/,
  );
});
test("destructive actions require confirmation and identifiers are escaped", async () => {
  assert.equal(command("delete").risk, "high-risk-write");
  assert.equal(command("stop", "runs").risk, "high-risk-write");
  const original = globalThis.fetch;
  setCliTokenManual("cli_test_automation", "https://automation-test.example");
  globalThis.fetch = async () => Response.json({ dryRun: true, valid: true });
  try {
    const preview = await command("result", "runs").dryRun!(
      context({ id: "a/b", runId: "r?x" }),
    );
    assert.equal(
      preview.request.url,
      "/api/cli/automation/v1/a%2Fb/runs/r%3Fx/result",
    );
    const deletion = await command("delete").dryRun!(context({ id: "a/b" }));
    assert.equal(deletion.request.method, "DELETE");
    assert.equal(deletion.validation.valid, true);
  } finally {
    globalThis.fetch = original;
  }
});
test("run posts one idempotent request and wait only reads that execution", async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  setCliTokenManual("cli_test_automation", "https://automation-test.example");
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(
      JSON.stringify(
        init?.method === "POST"
          ? { accepted: true, runId: "run-1" }
          : { status: "success", availability: "available", text: "done" },
      ),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  try {
    const output = await command("run").execute(
      context({ id: "a", commandId: "request-1", wait: true }),
    );
    assert.equal(output.result.text, "done");
    assert.equal(output.result.executionCompleted, true);
    assert.equal(calls.filter((c) => c.method === "POST").length, 1);
    assert.deepEqual(calls.find((c) => c.method === "POST")?.body, {
      commandId: "request-1",
    });
    assert.ok(calls.some((c) => /\/a\/runs\/run-1\/result$/.test(c.url)));
  } finally {
    globalThis.fetch = original;
  }
});
test("wait timeout retains result and never triggers again", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status: "running",
        runId: "r",
        availability: "pending",
      }),
      { status: 200 },
    );
  try {
    assert.deepEqual(await waitForRun(context({ timeout: 0 }), "a", "r"), {
      status: "running",
      runId: "r",
      availability: "pending",
      executionCompleted: false,
      timedOut: true,
    });
  } finally {
    globalThis.fetch = original;
  }
});

test("team names match Web Unicode and whitespace limits", () => {
  for (const name of ["字".repeat(50), "😀".repeat(50), "字 ".repeat(50)])
    assert.doesNotThrow(() =>
      configuration(
        context({
          targetType: "team",
          teamId: "t",
          name,
          triggerType: "manual",
        }),
        true,
      ),
    );
  for (const name of ["字".repeat(51), "😀".repeat(51), " ".repeat(192)])
    assert.throws(() =>
      configuration(
        context({
          targetType: "team",
          teamId: "t",
          name,
          triggerType: "manual",
        }),
        true,
      ),
    );
});
test("poll failure retains accepted execution and creation identifiers", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) =>
    init?.method === "POST"
      ? new Response(
          JSON.stringify({
            automation: { id: "a" },
            execution: { runId: "r", accepted: true },
          }),
          { status: 200 },
        )
      : new Response(JSON.stringify({ error: "unavailable" }), { status: 503 });
  try {
    const output = (await command("create").execute!(
      context({
        targetType: "agent",
        agentId: "a",
        name: "A",
        triggerType: "manual",
        triggerImmediately: true,
        wait: true,
        commandId: "c",
      }),
    )) as any;
    assert.equal(output.execution.runId, "r");
    assert.equal(output.commandId, "c");
    assert.deepEqual(
      { ...output.observation, message: undefined },
      {
        status: "failed",
        code: undefined,
        message: undefined,
        automationId: "a",
        runId: "r",
      },
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("real runtime uses user identity with or without an explicit host", async () => {
  const { createRuntimeContext } = await import("../src/framework/runner.ts");
  const keys = ["TE_CLAUDE_BASE_URL", "SANDBOX_ID", "SECRET_KEY"];
  const saved = keys.map((k) => process.env[k]);
  const original = globalThis.fetch;
  const seen: Headers[] = [];
  Object.assign(process.env, {
    TE_CLAUDE_BASE_URL: "https://automation-test.example/agent",
    SANDBOX_ID: "sandbox-test",
    SECRET_KEY: "test-secret",
  });
  globalThis.fetch = async (_url, init) => {
    seen.push(new Headers(init?.headers));
    return new Response("{}", { status: 200 });
  };
  try {
    const c = command("list");
    await c.execute!(createRuntimeContext(c, {}, {}));
    assert.equal(seen.at(-1)?.get("X-Sandbox-Id"), null);
    assert.ok(seen.at(-1)?.get("cli-token"));
    await c.execute!(
      createRuntimeContext(c, {}, { host: "https://automation-test.example" }),
    );
    assert.equal(seen.at(-1)?.get("X-Sandbox-Id"), null);
    assert.ok(seen.at(-1)?.get("cli-token"));
  } finally {
    globalThis.fetch = original;
    keys.forEach((k, i) => {
      if (saved[i] === undefined) delete process.env[k];
      else process.env[k] = saved[i];
    });
  }
});

test("blank update names fail validation before normal and dry-run transport", async () => {
  const ctx = context({ id: "a", targetType: "team", name: " " });
  assert.throws(() => command("update").validate!(ctx), /blank/);
  await assert.rejects(() => command("update").dryRun!(ctx), /blank/);
  await assert.rejects(() => command("update").execute!(ctx), /blank/);
});

test("automation dry-run performs server preflight and keeps payload redacted", async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  setCliTokenManual("cli_test_automation", "https://automation-test.example");
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return Response.json({
      dryRun: true,
      valid: true,
      operation: "update",
      targetType: "team",
      agentSpaceId: "space",
      automationId: "a",
    });
  };
  try {
    const result = await command("update").dryRun!(
      context({ id: "a", targetType: "team", message: "secret" }),
    );
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://automation-test.example/agent/api/cli/automation/v1/a?targetType=team&dryRun=true",
    );
    assert.deepEqual(calls[0].body, { message: "secret" });
    assert.deepEqual(result, {
      request: {
        method: "PATCH",
        url: "/api/cli/automation/v1/a?targetType=team",
        body: { payload: "[REDACTED]" },
      },
      validation: {
        dryRun: true,
        valid: true,
        operation: "update",
        targetType: "team",
        agentSpaceId: "space",
        automationId: "a",
      },
    });
  } finally {
    globalThis.fetch = original;
  }
});

test("every automation action sends a server dry-run preflight", async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; method: string }> = [];
  setCliTokenManual("cli_test_automation", "https://automation-test.example");
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method ?? "GET" });
    return Response.json({ dryRun: true, valid: true });
  };
  const cases = [
    [command("list"), {}],
    [command("get"), { id: "a" }],
    [
      command("create"),
      {
        targetType: "agent",
        agentId: "agent",
        name: "A",
        triggerType: "manual",
      },
    ],
    [command("update"), { id: "a", targetType: "agent", name: "B" }],
    [command("enable"), { id: "a" }],
    [command("disable"), { id: "a" }],
    [command("delete"), { id: "a" }],
    [command("run"), { id: "a", commandId: "run-command" }],
    [command("list", "runs"), { id: "a" }],
    [command("get", "runs"), { id: "a", runId: "r" }],
    [command("result", "runs"), { id: "a", runId: "r" }],
    [command("stop", "runs"), { id: "a", runId: "r" }],
    [
      command("retry", "runs"),
      { id: "a", runId: "r", commandId: "retry-command" },
    ],
  ] as const;
  try {
    for (const [item, values] of cases) {
      const result = await item.dryRun!(context(values));
      assert.equal(result.validation.valid, true);
      assert.equal(result.request.body?.message, undefined);
    }
    assert.equal(calls.length, cases.length);
    assert.ok(
      calls.every(
        ({ url }) => new URL(url).searchParams.get("dryRun") === "true",
      ),
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("automation errors preserve the server message code and hint", async () => {
  const original = globalThis.fetch;
  setCliTokenManual("cli_test_automation", "https://automation-test.example");
  globalThis.fetch = async () =>
    Response.json(
      {
        code: "BAD_REQUEST",
        error: "执行目标类型不匹配",
        hint: "先查询自动化详情。",
      },
      { status: 400 },
    );
  try {
    await assert.rejects(
      () =>
        command("update").execute!(
          context({ id: "a", targetType: "team", name: "B" }),
        ),
      (error: any) =>
        error?.message === "执行目标类型不匹配" &&
        error?.code === "BAD_REQUEST" &&
        error?.hint === "先查询自动化详情。",
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("run errors retain the server recovery hint and the reusable command ID", async () => {
  const original = globalThis.fetch;
  setCliTokenManual("cli_test_automation", "https://automation-test.example");
  globalThis.fetch = async () =>
    Response.json(
      {
        code: "AUTOMATION_SCHEDULE_PAUSED",
        error: "自动化已暂停",
        hint: "先启用该单 Agent 自动化，再发起执行。",
      },
      { status: 409 },
    );
  try {
    await assert.rejects(
      () =>
        command("run").execute!(
          context({ id: "a", commandId: "stable-command" }),
        ),
      (error: any) =>
        error?.message === "自动化已暂停" &&
        error?.code === "AUTOMATION_SCHEDULE_PAUSED" &&
        error?.hint.includes("先启用该单 Agent 自动化") &&
        error?.hint.includes("stable-command"),
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("non-interactive high-risk writes fail immediately without --yes", () => {
  const started = Date.now();
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "src/index.ts",
      "--no-update-check",
      "automation",
      "delete",
      "--id",
      "automation-1",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 15000,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        TE_CLAUDE_BASE_URL: "http://127.0.0.1:9",
        SANDBOX_ID: "non-interactive-test",
        SECRET_KEY: "non-interactive-secret",
      },
    },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.ok(Date.now() - started < 12000);
  assert.match(result.stderr, /CONFIRMATION_REQUIRED/);
  assert.match(result.stderr, /--yes/);
  assert.doesNotMatch(result.stderr, /Continue\?/);
  assert.doesNotMatch(result.stderr, /NETWORK_ERROR|Network request/);
});

test("interactive confirmation remains available only when both streams are TTYs", () => {
  assert.equal(
    canPromptForConfirmation({ isTTY: true }, { isTTY: true }),
    true,
  );
  assert.equal(
    canPromptForConfirmation({ isTTY: false }, { isTTY: true }),
    false,
  );
  assert.equal(
    canPromptForConfirmation({ isTTY: true }, { isTTY: false }),
    false,
  );
});

test("legacy Agent automation commands are not registered", () => {
  const retired = new Set([
    "+list-automations",
    "+create-automation",
    "+update-automation",
  ]);
  assert.deepEqual(
    teAgentCommands
      .filter((item) => retired.has(item.command))
      .map((item) => item.command),
    [],
  );
  const publishedFiles = [
    "README.md",
    "README.zh.md",
    "open-source/README.opensource.md",
    "open-source/README.opensource.zh.md",
    "skills/ae-agent/SKILL.md",
    "skills/ae-workspace/SKILL.md",
    "skills/ae-automation/SKILL.md",
    "skills/ae-automation/references/cli.md",
    "src/commands/te-agent/index.ts",
  ];
  for (const file of publishedFiles) {
    const content = readFileSync(file, "utf8");
    for (const commandName of retired)
      assert.doesNotMatch(
        content,
        new RegExp(`\\${commandName}`),
        `${file} still documents ${commandName}`,
      );
  }
});

test("legacy Agent automation invocations fail as unknown commands", () => {
  for (const retired of [
    "+list-automations",
    "+create-automation",
    "+update-automation",
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/index.ts",
        "--no-update-check",
        "agent",
        retired,
      ],
      { cwd: process.cwd(), encoding: "utf8", timeout: 15000 },
    );
    assert.equal(result.status, 1, `${retired}: ${result.stderr}`);
    assert.match(result.stderr, /unknown command/i);
  }
});

test("Agent and Team share all notification fields and preserve patch omission", () => {
  const channels = [
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
  ];
  for (const targetType of ["agent", "team"]) {
    assert.deepEqual(
      configuration(
        context({
          targetType,
          channels,
          feishuChatId: "chat-f",
          larkChatId: "chat-l",
          slackChannelId: "channel-s",
        }),
        false,
      ),
      {
        channels,
        feishuChatId: "chat-f",
        larkChatId: "chat-l",
        slackChannelId: "channel-s",
      },
    );
    assert.deepEqual(
      configuration(
        context({
          targetType,
          channels: [],
          feishuChatId: "null",
          larkChatId: "null",
          slackChannelId: "null",
        }),
        false,
      ),
      {
        channels: [],
        feishuChatId: null,
        larkChatId: null,
        slackChannelId: null,
      },
    );
    assert.deepEqual(
      configuration(context({ targetType, name: "Updated" }), false),
      { name: "Updated" },
    );
    assert.throws(
      () =>
        configuration(context({ targetType, channels: ["invalid"] }), false),
      /supported notification channels/,
    );
  }
  assert.throws(
    () => configuration(context({ targetType: "agent", scope: {} }), false),
    /not applicable/,
  );
});

test("automation uses the current session CLI identity instead of shared sandbox binding", async () => {
  const root = mkdtempSync(join(tmpdir(), "automation-session-auth-"));
  const env = {
    SANDBOX_RUNTIME_ROOT: root,
    TE_CLAUDE_BASE_URL: "http://automation-main.local",
    SANDBOX_ID: "space-sandbox",
    SANDBOX_SECRET_KEY: "sandbox-test-secret",
    TE_AGENT_CURRENT_AGENT_SPACE_ID: "space-shared",
    TE_AGENT_CONVERSATION_ID: "conversation-shared",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((k) => [k, process.env[k]]),
  );
  mkdirSync(join(root, ".ae-config"), { recursive: true });
  writeFileSync(
    join(root, ".ae-config", "cli-token.json"),
    JSON.stringify({
      url: "https://automation-user.example",
      token: "cli_current_session",
    }),
  );
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  globalThis.fetch = async (url, init) => {
    calls.push({
      url: String(url),
      headers: init?.headers as Record<string, string>,
    });
    if (String(url).includes("/workspace/v1/target"))
      return Response.json({
        ok: true,
        data: { agentSpaceId: "space-from-conversation" },
      });
    return Response.json({
      return_code: 0,
      items: [],
      valid: true,
      automation: { id: "created-automation" },
    });
  };
  try {
    Object.assign(process.env, env);
    const ctx = {
      ...context(),
      hostOverride: () => undefined,
      host: () => "https://automation-user.example",
    };
    await command("list").execute(ctx);
    const call = calls.find((c) => c.url.includes("/api/cli/automation/v1"))!;
    assert.equal(call.headers["cli-token"], "cli_current_session");
    assert.equal(call.headers["X-Sandbox-Id"], undefined);
    assert.equal(call.headers["X-Sandbox-Secret-Key"], undefined);
    assert.match(call.url, /agentSpaceId=space-shared/);
    await command("create").execute({
      ...ctx,
      ...context({
        targetType: "agent",
        agentId: "agent-1",
        name: "test",
        triggerType: "manual",
        channels: ["slack"],
      }),
      hostOverride: () => undefined,
    });
    assert.match(calls.at(-1)!.url, /agentSpaceId=space-shared/);
    await command("list").execute({
      ...ctx,
      ...context({ agentSpaceId: "space-explicit" }),
      hostOverride: () => undefined,
    });
    assert.match(calls.at(-1)!.url, /agentSpaceId=space-explicit/);
    process.env.TE_AGENT_CURRENT_AGENT_SPACE_ID = "";
    await command("list").execute(ctx);
    assert.match(calls.at(-1)!.url, /agentSpaceId=space-from-conversation/);
    assert.ok(
      calls.some((c) => c.url.includes("conversationId=conversation-shared")),
    );
    process.env.TE_AGENT_CURRENT_AGENT_SPACE_ID = "space-shared";
    calls.length = 0;
    globalThis.fetch = async (url, init) => {
      calls.push({
        url: String(url),
        headers: init?.headers as Record<string, string>,
      });
      return Response.json(
        { error: "Space is read-only", code: "FORBIDDEN" },
        { status: 403 },
      );
    };
    await assert.rejects(
      () => command("list").execute(ctx),
      /Space is read-only/,
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].headers["cli-token"], "cli_current_session");
    assert.equal(calls[0].headers["X-Sandbox-Id"], undefined);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    rmSync(root, { recursive: true, force: true });
  }
});

test("shared space conversations keep their own credentials and fail closed", async () => {
  const root = mkdtempSync(join(tmpdir(), "automation-two-users-"));
  const host = "https://two-users-automation.example";
  const keys = ["SANDBOX_RUNTIME_ROOT", "TE_AGENT_CLI_CONFIG_DIR"];
  const previous = keys.map((k) => process.env[k]);
  const { getCliToken, peekCliToken } =
    await import("../src/core/cli-token.ts");
  const shared = join(root, ".ae-config");
  const a = join(root, "conversation-a", ".ae-config", "attempt-a");
  const b = join(root, "conversation-b", ".ae-config", "attempt-b");
  for (const [dir, token] of [
    [shared, "cli_user_b"],
    [a, "cli_user_a"],
    [b, "cli_user_b"],
  ]) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "cli-token.json"),
      JSON.stringify({ url: host, token }),
    );
  }
  try {
    process.env.SANDBOX_RUNTIME_ROOT = root;
    process.env.TE_AGENT_CLI_CONFIG_DIR = a;
    const firstA = getCliToken(host);
    process.env.TE_AGENT_CLI_CONFIG_DIR = b;
    const firstB = getCliToken(host);
    assert.deepEqual(await Promise.all([firstA, firstB]), [
      "cli_user_a",
      "cli_user_b",
    ]);
    process.env.TE_AGENT_CLI_CONFIG_DIR = a;
    assert.equal(await getCliToken(host), "cli_user_a");
    assert.equal(peekCliToken(host), "cli_user_a");
    await assert.rejects(
      () => getCliToken("https://unrelated.example"),
      /session.*credential/i,
    );
    rmSync(join(a, "cli-token.json"));
    await assert.rejects(() => getCliToken(host), /session.*credential/i);
    assert.equal(peekCliToken(host), undefined);
    writeFileSync(join(a, "cli-token.json"), "{}");
    await assert.rejects(() => getCliToken(host), /session.*credential/i);
  } finally {
    keys.forEach((k, i) => {
      if (previous[i] === undefined) delete process.env[k];
      else process.env[k] = previous[i];
    });
    rmSync(root, { recursive: true, force: true });
  }
});

test("multi-date schedules preserve legacy fields and validate arrays", () => {
  for (const targetType of ["agent", "team"]) {
    for (const [fields, schedule] of [
      [
        { scheduleKind: "weekly", time: "09:17", weekdays: [5, 1, 3, 1] },
        { kind: "weekly", time: "09:17", weekdays: [1, 3, 5] },
      ],
      [
        { scheduleKind: "monthly", time: "09:59", daysOfMonth: [31, 1] },
        { kind: "monthly", time: "09:59", daysOfMonth: [1, 31] },
      ],
      [
        {
          scheduleKind: "monthly",
          time: "09:17",
          daysOfMonth: ["L", 31, 1, "L"],
        },
        { kind: "monthly", time: "09:17", daysOfMonth: [1, 31, "L"] },
      ],
      [
        { scheduleKind: "monthly", time: "09:17", daysOfMonth: ["L"] },
        { kind: "monthly", time: "09:17", daysOfMonth: ["L"] },
      ],
      [
        { scheduleKind: "monthly", time: "09:01", dayOfMonth: 31 },
        { kind: "monthly", time: "09:01", dayOfMonth: 31 },
      ],
    ])
      assert.deepEqual(
        configuration(context({ targetType, ...fields }), false).schedule,
        schedule,
      );
    for (const fields of [
      { scheduleKind: "weekly", time: "09:17", weekdays: [] },
      { scheduleKind: "weekly", time: "09:17", weekdays: [7] },
      { scheduleKind: "weekly", time: "09:17", weekdays: [1], weekday: 1 },
      { scheduleKind: "monthly", time: "09:17", daysOfMonth: [0, 32] },
      { scheduleKind: "monthly", time: "09:17", daysOfMonth: ["last"] },
      {
        scheduleKind: "monthly",
        time: "09:17",
        daysOfMonth: ["L"],
        dayOfMonth: 1,
      },
      { scheduleKind: "weekly", time: "09:17", weekdays: ["L"] },
      {
        scheduleKind: "monthly",
        time: "09:17",
        daysOfMonth: [1],
        dayOfMonth: 1,
      },
      { scheduleKind: "daily", time: "09:17", weekdays: [1] },
      { weekdays: [1] },
      { weekdays: [] },
      { daysOfMonth: [] },
    ])
      assert.throws(() =>
        configuration(context({ targetType, ...fields }), false),
      );
    for (const cronExpression of [
      "17 9 * * 1,3,5",
      "59 9 1,15,31 * *",
      "17 9 L * *",
      "17 9 1,31,L * *",
    ])
      assert.equal(
        configuration(context({ targetType, cronExpression }), false)
          .cronExpression,
        cronExpression,
      );
    for (const cronExpression of [
      "17 9 * * 1,7",
      "17 9 1,32 * *",
      "17 9 * * 1,",
      "17 9 1 * 1",
      "17 9 * * L",
      "17 9 L,L, * *",
      "17 9 L-1 * *",
      "17 9 L L *",
    ])
      assert.throws(() =>
        configuration(context({ targetType, cronExpression }), false),
      );
  }
});

test("create and update expose plural JSON date flags alongside legacy numeric flags", () => {
  for (const name of ["create", "update"]) {
    for (const flag of ["weekdays", "days-of-month"])
      assert.equal(
        command(name).flags?.find((item) => item.name === flag)?.type,
        "json",
      );
    for (const flag of ["weekday", "day-of-month"])
      assert.equal(
        command(name).flags?.find((item) => item.name === flag)?.type,
        "number",
      );
  }
});
