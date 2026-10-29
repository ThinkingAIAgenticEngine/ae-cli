import assert from 'node:assert/strict';
import { askStatus } from '../src/commands/te-kb/ask-status.ts';
import { transformCompletedResponse } from '../src/commands/te-kb/ask-shared.ts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { RuntimeContext } from '../src/framework/types.ts';

const host = 'https://kb-reference.example.test';
function context(index?: number): RuntimeContext {
  return {
    str: (key) => (key === 'execution-id' ? 'saved-ask' : ''),
    optionalNum: (key) => (key === 'source-index' ? index : undefined),
    num: () => 0,
    bool: () => false,
    json: () => undefined,
    host: () => host,
    service: () => 'kb',
    mcpUrl: () => undefined,
    api: async () => {
      throw new Error('unused');
    },
    querySql: async () => {
      throw new Error('unused');
    },
    queryReportData: async () => {
      throw new Error('unused');
    },
    token: async () => '',
    out: async () => undefined,
  };
}
const source = {
  knowledgeBaseKey: 'company:handbook',
  path: 'wiki/page.md',
  readView: {
    resourceKey: 'kb:id',
    viewKind: 'snapshot' as const,
    consistency: 'version_pinned' as const,
    readIdentity: 'identity-v1',
    versionId: 'v1',
    versionNumber: 1,
  },
  reference: { executionId: 'saved-ask', sourceIndex: 0 },
};
assert.deepEqual(
  transformCompletedResponse({
    executionId: 'saved-ask',
    status: 'completed',
    sources: [source],
  }).sources,
  [source],
);
for (const invalid of [-1, 0.5, NaN, 1_000_000_000])
  assert.throws(() => askStatus.validate?.(context(invalid)), /source-index/);
assert.doesNotThrow(() => askStatus.validate?.(context(0)));
assert.equal(
  askStatus.dryRun!(context(0)).url,
  `${host}/agent/api/external/knowledge-bases/ask?executionId=saved-ask&sourceIndex=0`,
);
assert.equal(
  askStatus.dryRun!(context()).url,
  `${host}/agent/api/external/knowledge-bases/ask?executionId=saved-ask`,
);

const originalFetch = globalThis.fetch;
const oldConfigDir = process.env.TE_AGENT_CLI_CONFIG_DIR;
const oldRequired = process.env.AE_KB_READ_CONTEXT_REQUIRED;
const oldContextFile = process.env.AE_KB_READ_CONTEXT_FILE;
const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-reference-cli-'));
fs.writeFileSync(
  path.join(configDir, 'cli-token.json'),
  JSON.stringify({ url: host, token: 'cli_reference_user' }),
  { mode: 0o600 },
);
try {
  process.env.TE_AGENT_CLI_CONFIG_DIR = configDir;
  delete process.env.AE_KB_READ_CONTEXT_REQUIRED;
  delete process.env.AE_KB_READ_CONTEXT_FILE;
  let requests = 0;
  let captured: { url: string; headers: Headers } | undefined;
  const reply = { ...source.reference, ...source, content: 'V1 ORIGINAL' };
  globalThis.fetch = async (input, init) => {
    requests += 1;
    captured = { url: String(input), headers: new Headers(init?.headers) };
    return new Response(JSON.stringify(reply), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  assert.deepEqual(JSON.parse(JSON.stringify(await askStatus.execute(context(0)))), reply);
  assert.equal(
    captured?.url,
    `${host}/agent/api/external/knowledge-bases/ask?executionId=saved-ask&sourceIndex=0`,
  );
  assert.equal(captured?.headers.get('cli-token'), 'cli_reference_user');
  assert.equal(captured?.headers.get('X-KB-Read-Context'), null);
  for (const scenario of ['missing-file', 'expired', 'other-execution', 'file-only']) {
    process.env.AE_KB_READ_CONTEXT_REQUIRED = '1';
    const contextFile = path.join(configDir, 'execution-context.json');
    if (scenario === 'missing-file') {
      delete process.env.AE_KB_READ_CONTEXT_FILE;
    } else {
      process.env.AE_KB_READ_CONTEXT_FILE = contextFile;
      fs.writeFileSync(contextFile, JSON.stringify({
        formatVersion: 1, required: true,
        executionRef: scenario === 'other-execution' ? 'ask:other-ask' : 'ask:saved-ask',
        readContextId: 'active-context', token: `cli_kbr_${'a'.repeat(43)}`, origin: host,
        expiresAt: new Date(scenario === 'expired' ? 1 : Date.now() + 60_000).toISOString(),
      }), { mode: 0o600 });
      if (scenario === 'file-only') delete process.env.AE_KB_READ_CONTEXT_REQUIRED;
    }
    const before = requests;
    await assert.rejects(askStatus.execute(context(0)), { code: 'KB_READ_CONTEXT_REFERENCE_FORBIDDEN' }, scenario);
    assert.equal(requests, before, `${scenario}: historical content must not use the ordinary token`);
    await askStatus.execute(context());
    assert.equal(requests, before + 1, `${scenario}: ordinary status polling remains available`);
  }
} finally {
  globalThis.fetch = originalFetch;
  if (oldConfigDir === undefined) delete process.env.TE_AGENT_CLI_CONFIG_DIR;
  else process.env.TE_AGENT_CLI_CONFIG_DIR = oldConfigDir;
  if (oldRequired === undefined) delete process.env.AE_KB_READ_CONTEXT_REQUIRED;
  else process.env.AE_KB_READ_CONTEXT_REQUIRED = oldRequired;
  if (oldContextFile === undefined) delete process.env.AE_KB_READ_CONTEXT_FILE;
  else process.env.AE_KB_READ_CONTEXT_FILE = oldContextFile;
  fs.rmSync(configDir, { recursive: true, force: true });
}
console.log('Ask historical reference CLI contract passed');
