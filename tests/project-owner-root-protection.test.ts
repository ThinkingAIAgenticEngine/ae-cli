import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';
import { CapabilityGatewayError } from '../src/core/capability-api.js';
import type { RuntimeContext } from '../src/framework/types.js';
import { projectOwnerUpdate } from '../src/commands/te-analysis/project/owner/update.js';

const host = 'https://project-owner.test';
const originalFetch = globalThis.fetch;
let calls: { url: string; input: Record<string, unknown> }[];

function context(owner?: number, extra: Record<string, unknown> = {}): RuntimeContext {
  const values: Record<string, unknown> = {
    'company-id': 5, 'project-id': 81, 'owner-user-id': owner, ...extra,
  };
  return {
    str: (name) => values[name] == null ? '' : String(values[name]),
    num: (name) => Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
    api: async () => ({}), querySql: async () => ({}), queryReportData: async () => ({}),
    token: async () => 'test-token', host: () => host, mcpUrl: () => undefined,
    service: () => 'project', out: () => undefined,
  };
}

beforeEach(() => {
  calls = [];
  setCliTokenManual('project-owner-test-token', host);
  globalThis.fetch = async (request, init) => {
    const url = String(request);
    const input = JSON.parse(String(init?.body)).input;
    calls.push({ url, input });
    assert.match(url, /project\.owner\.update\/(validate|dry-run|execute)$/);
    return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
});

for (const phase of ['validateInput', 'dryRun', 'execute'] as const) {
  for (const owner of [2, 42, undefined]) {
    test(`${phase} forwards owner ${owner ?? 'omitted'} without member-read discovery`, async () => {
      await projectOwnerUpdate[phase]!(context(owner));
      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0].input, {
        project_id: 81,
        company_id: 5,
        ...(owner === undefined ? {} : { owner_user_id: owner }),
      });
    });
  }
}

test('optional project fields are preserved alongside the supplied root ID', async () => {
  await projectOwnerUpdate.execute!(context(2, { 'project-name': 'Renamed', 'project-remark': 'Remark' }));
  assert.deepEqual(calls[0].input, {
    project_id: 81, company_id: 5, owner_user_id: 2, project_name: 'Renamed', project_remark: 'Remark',
  });
  assert.equal(calls.length, 1);
});

test('business errors retain their gateway contract without a retry that clears the owner', async () => {
  globalThis.fetch = async (request, init) => {
    calls.push({ url: String(request), input: JSON.parse(String(init?.body)).input });
    return new Response(JSON.stringify({ ok: false, error: { code: 'INVALID_OWNER', message: 'Invalid owner' } }), { status: 400 });
  };
  await assert.rejects(projectOwnerUpdate.execute!(context(42)), (error: unknown) => {
    assert(error instanceof CapabilityGatewayError);
    assert.equal(error.code, 'INVALID_OWNER');
    return true;
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input.owner_user_id, 42);
});
