import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { thingsCommands } from '../../src/commands/things/index.js';
import { requestThings } from '../../src/commands/things/client.js';
import { executeCapability } from '../../src/core/capability-api.js';
import { clearCliTokenCache } from '../../src/core/cli-token.js';
import { logger } from '../../src/core/logger.js';
import type { RuntimeContext } from '../../src/framework/types.js';

export type ContextMode = 'claude' | 'codex' | 'none';
export type CapturedRequest = {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
  agentClient: string | null;
  hasCliToken: boolean;
  hasAuthorization: boolean;
};

/** Runs actual command/transport code against a synthetic network boundary. */
export async function captureThingsAgentContext(mode: ContextMode): Promise<CapturedRequest[]> {
  const host = 'http://things-agent-context-fixture.invalid';
  const root = mkdtempSync(join(tmpdir(), 'things-agent-context-'));
  const savedEnv = { ...process.env };
  const savedFetch = globalThis.fetch;
  const savedWarn = logger.warn;
  const savedInfo = logger.info;
  const rows: CapturedRequest[] = [];
  try {
    for (const key of Object.keys(process.env)) {
      if (/^(?:CODEX_|CLAUDE|TA_CLI_|TE_AGENT_|WORKBUDDY_)/.test(key)) delete process.env[key];
    }
    mkdirSync(join(root, '.ae-config'));
    writeFileSync(join(root, '.ae-config', 'cli-token.json'), JSON.stringify({ url: host, token: 'synthetic-context-fixture' }));
    writeFileSync(join(root, 'context.json'), '{}');
    process.env.SANDBOX_RUNTIME_ROOT = root;
    process.env.TA_CLI_CONTEXT_FILE = join(root, 'context.json');
    process.env.TE_CLAUDE_BASE_PATH = '/agent';
    delete process.env.AE_API_PREFIX;
    process.env.TE_AGENT_CONVERSATION_ID = 'conversation-fixture';
    if (mode === 'claude') process.env.CLAUDE_CODE_SESSION_ID = 'claude-fixture-session';
    if (mode === 'codex') process.env.CODEX_THREAD_ID = 'codex-fixture-session';
    clearCliTokenCache(host);
    logger.warn = () => {};
    logger.info = () => {};
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      // Never renew or persist a synthetic credential in the user's store.
      if (url.pathname === '/v1/ta/cli/token/renew') {
        return new Response(JSON.stringify({ return_code: 1, return_message: 'Synthetic fixture does not renew credentials' }));
      }
      const headers = new Headers(init?.headers);
      const client = headers.get('X-TA-CLI-Agent-Client');
      rows.push({
        method: init?.method ?? 'GET',
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : null,
        agentClient: client ? Buffer.from(client, 'base64url').toString('utf8') : null,
        hasCliToken: headers.get('cli-token') === 'synthetic-context-fixture',
        hasAuthorization: headers.has('Authorization'),
      });
      return new Response(JSON.stringify({ ok: true, data: url.pathname.endsWith('/target') ? { agentSpaceId: 'space-fixture' } : { id: 'thing-fixture', version: 1 } }));
    };
    const values: Record<string, unknown> = {
      agentSpaceId: 'space-fixture',
      title: 'Synthetic acceptance thing',
      description: 'Verify the default Agent CLI request contract',
      commandId: 'b23d2140-9e1f-456a-9e8a-7252398f5789',
    };
    const unused = async (): Promise<never> => { throw new Error('Unused fixture boundary'); };
    const ctx: RuntimeContext = {
      str: (key) => typeof values[key] === 'string' ? String(values[key]) : '',
      num: (key) => Number(values[key]),
      optionalNum: (key) => values[key] === undefined ? undefined : Number(values[key]),
      bool: (key) => values[key] === true,
      json: (key) => values[key],
      list: () => [],
      api: unused, communityReport: unused, localDataUpload: unused, querySql: unused, queryReportData: unused,
      token: async () => '', host: () => host, mcpUrl: () => undefined, service: () => 'things', out: () => {},
    };
    const create = thingsCommands.find((command) => !command.resource && command.command === 'create');
    if (!create) throw new Error('Things create command is unavailable');
    await create.execute(ctx);
    const commandId = 'a23d2140-9e1f-456a-9e8a-7252398f5789';
    for (const [method, suffix, body] of [
      ['PATCH', '/thing-fixture', { commandId, expectedVersion: 1, title: 'Updated fixture' }],
      ['POST', '/thing-fixture/entries', { commandId, type: 'note', content: 'Fixture note' }],
      ['POST', '/thing-fixture/archive', { commandId, expectedVersion: 1 }],
      ['DELETE', '/thing-fixture', { commandId, expectedVersion: 1, confirmDelete: true }],
    ] as const) {
      await requestThings(ctx, method, `agent-spaces/space-fixture/things${suffix}`, body);
    }
    await executeCapability(host, 'analysis', 'analysis.dashboard.list', { project_id: 1 });
    return rows;
  } finally {
    globalThis.fetch = savedFetch;
    logger.warn = savedWarn;
    logger.info = savedInfo;
    clearCliTokenCache(host);
    for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
    rmSync(root, { recursive: true, force: true });
  }
}
