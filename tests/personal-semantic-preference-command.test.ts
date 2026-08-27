import assert from 'node:assert/strict';
import {
  optionalResourceRefs,
  validatePersonalSemanticWrite,
} from '../src/commands/personal-semantic-preference/shared.ts';
import { personalSemanticPreferenceAdd } from '../src/commands/personal-semantic-preference/add.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

function context(contextType: string, resourceRefs?: unknown): RuntimeContext {
  return {
    str: (name: string) => {
      if (name === 'context-type') return contextType;
      if (name === 'resource-refs') return resourceRefs === undefined ? '' : JSON.stringify(resourceRefs);
      return '';
    },
    json: (name: string) => name === 'resource-refs' ? resourceRefs : undefined,
  } as RuntimeContext;
}

const refs = [
  { resource_type: 'report', resource_key: '101', display_name: 'Revenue daily report' },
  { resource_type: 'event', resource_key: '$login', display_name: 'Login event' },
];

assert.deepEqual(optionalResourceRefs(context('asset_context', refs)), refs);
assert.doesNotThrow(() => validatePersonalSemanticWrite(context('asset_context', refs)));
assert.throws(
  () => validatePersonalSemanticWrite(context('asset_context')),
  /--resource-refs is required/,
);
assert.throws(
  () => validatePersonalSemanticWrite(context('preference', refs)),
  /only allowed with --context-type asset_context/,
);
assert.throws(
  () => validatePersonalSemanticWrite(context('asset_context', [refs[0], refs[0]])),
  /unique resource_type and resource_key pairs/,
);

const host = 'https://personal-semantic.example.com';
setCliTokenManual('personal-semantic-token', host);
let capturedBody: Record<string, any> | undefined;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (_input: any, init?: RequestInit) => {
  capturedBody = JSON.parse(String(init?.body));
  return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
}) as typeof fetch;
try {
  const values: Record<string, unknown> = {
    'context-type': 'asset_context',
    'resource-refs': refs,
    title: 'Today data',
    summary: 'Use fixed assets',
    content: 'Use the referenced assets in order.',
    keywords: ['today'],
  };
  const ctx = {
    host: () => host,
    str: (name: string) => {
      const value = values[name];
      return value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
    },
    num: (name: string) => name === 'project-id' ? 6 : 0,
    optionalNum: () => undefined,
    bool: () => false,
    json: (name: string) => values[name],
    list: () => [],
  } as RuntimeContext;

  await personalSemanticPreferenceAdd.dryRun!(ctx);

  assert.deepEqual(capturedBody?.input.resource_refs, refs);
  assert.equal(capturedBody?.input.context_type, 'asset_context');
} finally {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
}

process.stdout.write('personal semantic preference command tests passed\n');
