import assert from 'node:assert/strict';
import {
  optionalResourceRefs,
  validatePersonalSemanticWrite,
} from '../src/commands/personal-semantic-preference/shared.ts';
import { personalSemanticPreferenceAdd } from '../src/commands/personal-semantic-preference/add.ts';
import { personalSemanticPreferenceDelete } from '../src/commands/personal-semantic-preference/delete.ts';
import { personalSemanticPreferenceGet } from '../src/commands/personal-semantic-preference/get.ts';
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
let capturedUrl = '';
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: RequestInit) => {
  capturedUrl = String(input);
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

  const getCtx = {
    host: () => host,
    str: (name: string) => {
      if (name === 'id') return 'preference_31';
      if (name === 'title') return 'Today data';
      return '';
    },
    num: (name: string) => name === 'project-id' ? 6 : 0,
    optionalNum: () => undefined,
    bool: (name: string) => name === 'mark-used',
    json: () => undefined,
    list: () => [],
  } as RuntimeContext;

  await personalSemanticPreferenceGet.dryRun!(getCtx);

  const titleFlag = personalSemanticPreferenceGet.flags.find((flag) => flag.name === 'title');
  assert.equal(titleFlag?.required, true);
  assert.equal(titleFlag?.minLength, 1);
  assert.match(capturedUrl, /business_semantics\.personal_context\.get\/dry-run$/);
  assert.deepEqual(capturedBody?.input, {
    project_id: 6,
    id: 'preference_31',
    title: 'Today data',
    mark_used: true,
  });

  const deleteCtx = {
    host: () => host,
    str: (name: string) => {
      if (name === 'id') return 'preference_31';
      if (name === 'request-id') return 'delete-request-1';
      return '';
    },
    num: (name: string) => {
      if (name === 'project-id') return 6;
      if (name === 'expected-revision') return 3;
      return 0;
    },
    optionalNum: () => undefined,
    bool: () => false,
    json: () => undefined,
    list: () => [],
  } as RuntimeContext;

  await personalSemanticPreferenceDelete.dryRun!(deleteCtx);

  assert.match(capturedUrl, /business_semantics\.personal_context\.delete\/dry-run$/);
  assert.deepEqual(capturedBody?.input, {
    project_id: 6,
    id: 'preference_31',
    expected_revision: 3,
    request_id: 'delete-request-1',
  });
} finally {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
}

process.stdout.write('personal semantic preference command tests passed\n');
