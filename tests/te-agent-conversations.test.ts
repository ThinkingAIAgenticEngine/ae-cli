/**
 * Agent archived conversation command tests.
 *
 * Run: npx tsx tests/te-agent-conversations.test.ts
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildArchivedConversationSearchPath,
  findArchivedConversations,
  formatTimestampInTimeZone,
  restoreConversation,
} from "../src/commands/te-agent/conversations.ts";
import { TeAgentApiError } from "../src/core/te-agent-client.ts";
import type { RuntimeContext } from "../src/framework/types.ts";

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => (values[name] === undefined ? "" : String(values[name])),
    num: (name) => Number(values[name]),
    optionalNum: (name) =>
      values[name] === undefined ? undefined : Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
    api: async () => undefined,
    communityReport: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => "",
    host: () => "http://example.test",
    mcpUrl: () => undefined,
    service: () => "agent",
    out: async () => undefined,
  };
}

async function withEnv(
  values: Record<string, string | undefined>,
  run: () => Promise<void> | void,
): Promise<void> {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const noCurrentAgent = { TE_AGENT_CURRENT_AGENT_ID: undefined };

test("find command requires an explicit scope outside an Agent sandbox", async () => {
  await withEnv(noCurrentAgent, () => {
    assert.throws(
      () => findArchivedConversations.validate?.(ctx({ limit: 20 })),
      /Archive scope is required/,
    );
    assert.throws(
      () =>
        findArchivedConversations.validate?.(ctx({ all: false, limit: 20 })),
      /Archive scope is required/,
    );
  });
});

test("find command uses the current Agent sandbox scope by default", async () => {
  await withEnv({ TE_AGENT_CURRENT_AGENT_ID: "agent-from-env" }, () => {
    const path = buildArchivedConversationSearchPath(
      ctx({ q: "quarterly review", limit: 20 }),
    );
    assert.equal(
      path,
      "/api/sandbox/agent/conversations/archived?q=quarterly+review&agentId=agent-from-env&limit=20",
    );
  });
});

test("explicit Agent scope overrides the sandbox Agent and encodes the keyword", async () => {
  await withEnv({ TE_AGENT_CURRENT_AGENT_ID: "agent-from-env" }, () => {
    const path = buildArchivedConversationSearchPath(
      ctx({ q: "review & plan", agentId: "agent/explicit", limit: 1 }),
    );
    assert.equal(
      path,
      "/api/sandbox/agent/conversations/archived?q=review+%26+plan&agentId=agent%2Fexplicit&limit=1",
    );
  });
});

test("all=true is explicit, mutually exclusive with Agent ID, and supports limit 100", async () => {
  await withEnv(noCurrentAgent, () => {
    const allContext = ctx({ all: true, limit: 100 });
    assert.doesNotThrow(() => findArchivedConversations.validate?.(allContext));
    assert.equal(
      buildArchivedConversationSearchPath(allContext),
      "/api/sandbox/agent/conversations/archived?all=true&limit=100",
    );
    assert.throws(
      () =>
        findArchivedConversations.validate?.(
          ctx({ all: true, agentId: "agent-1", limit: 20 }),
        ),
      /cannot be used together/,
    );
  });
});

test("limit defaults to 20 and rejects values outside 1-100", async () => {
  await withEnv(noCurrentAgent, () => {
    const scoped = ctx({ agentId: "agent-1" });
    assert.match(buildArchivedConversationSearchPath(scoped), /limit=20$/);
    assert.throws(
      () =>
        findArchivedConversations.validate?.(
          ctx({ agentId: "agent-1", limit: 0 }),
        ),
      /between 1 and 100/,
    );
    assert.throws(
      () =>
        findArchivedConversations.validate?.(
          ctx({ agentId: "agent-1", limit: 101 }),
        ),
      /between 1 and 100/,
    );
  });
});

test("find command rejects an invalid IANA time zone", async () => {
  await withEnv(noCurrentAgent, () => {
    assert.throws(
      () =>
        findArchivedConversations.validate?.(
          ctx({ agentId: "agent-1", limit: 20, timeZone: "Mars/Olympus" }),
        ),
      /--time-zone must be a valid IANA time zone/,
    );
  });
});

test("timestamp display follows the selected IANA time zone", () => {
  const timestamp = "2026-07-29T03:24:00.000Z";
  assert.equal(
    formatTimestampInTimeZone(timestamp, "Asia/Shanghai"),
    "2026-07-29 11:24:00",
  );
  assert.equal(
    formatTimestampInTimeZone(timestamp, "America/Los_Angeles"),
    "2026-07-28 20:24:00",
  );
});

test("restore dry-run URL-encodes the conversation ID", () => {
  assert.deepEqual(
    restoreConversation.dryRun?.(ctx({ conversationId: "conversation/a b" })),
    {
      method: "POST",
      url: "/api/sandbox/agent/conversations/conversation%2Fa%20b/restore",
      body: {},
    },
  );
});

test("execute preserves UTC timestamps and defaults local output to Shanghai", async () => {
  const previousFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({
        items: [
          {
            id: "conversation-1",
            title: "Quarterly review",
            lastPreview: "Review the final numbers",
            archivedAt: "2026-07-23T08:00:00.000Z",
            updatedAt: "2026-07-22T08:00:00.000Z",
            agent: { id: "agent-1", name: "Reviewer", scope: "personal" },
          },
        ],
        hasMore: true,
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    await withEnv(
      {
        TE_CLAUDE_BASE_URL: "http://te-claude.test",
        SANDBOX_ID: "sandbox-1",
        SECRET_KEY: "sandbox-secret",
        SANDBOX_SECRET_KEY: undefined,
      },
      async () => {
        const output = await findArchivedConversations.execute(
          ctx({ agentId: "agent-1", limit: 20 }),
        );
        assert.equal(
          requestedUrl,
          "http://te-claude.test/api/sandbox/agent/conversations/archived?agentId=agent-1&limit=20",
        );
        assert.deepEqual(output, {
          items: [
            {
              conversation_id: "conversation-1",
              title: "Quarterly review",
              last_preview: "Review the final numbers",
              archived_at: "2026-07-23T08:00:00.000Z",
              archived_at_local: "2026-07-23 16:00:00",
              updated_at: "2026-07-22T08:00:00.000Z",
              updated_at_local: "2026-07-22 16:00:00",
              time_zone: "Asia/Shanghai",
              agent: {
                agent_id: "agent-1",
                name: "Reviewer",
                avatar_url: undefined,
                scope: "personal",
              },
            },
          ],
          has_more: true,
        });
      },
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("restore is idempotent and preserves API conflict details", async () => {
  const previousFetch = globalThis.fetch;
  let requestedUrl = "";
  let responseStatus = 200;
  globalThis.fetch = (async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return responseStatus === 200
      ? new Response(
          JSON.stringify({ changed: false, conversationId: "conversation-1" }),
          {
            status: 200,
          },
        )
      : new Response(
          JSON.stringify({
            error: "Conversation is active",
            code: "conversation_active",
          }),
          { status: responseStatus },
        );
  }) as typeof fetch;

  try {
    await withEnv(
      {
        TE_CLAUDE_BASE_URL: "http://te-claude.test",
        SANDBOX_ID: "sandbox-1",
        SECRET_KEY: "sandbox-secret",
        SANDBOX_SECRET_KEY: undefined,
      },
      async () => {
        assert.deepEqual(
          await restoreConversation.execute(
            ctx({ conversationId: "conversation-1" }),
          ),
          {
            changed: false,
            conversation_id: "conversation-1",
          },
        );
        assert.equal(
          requestedUrl,
          "http://te-claude.test/api/sandbox/agent/conversations/conversation-1/restore",
        );

        responseStatus = 409;
        await assert.rejects(
          () =>
            restoreConversation.execute(
              ctx({ conversationId: "conversation-1" }),
            ),
          (error: unknown) =>
            error instanceof TeAgentApiError &&
            error.status === 409 &&
            error.code === "conversation_active",
        );
      },
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});
