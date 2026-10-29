import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { communitySpacesList } from '../src/commands/te-community/spaces-list.ts';
import { registerCapabilityGatewayRoute } from '../src/core/capability-routing.ts';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';
import { PermissionError } from '../src/core/errors.ts';
import { SecureStoreAuthError } from '../src/core/secure-store.ts';
import { formatOutput } from '../src/framework/output.ts';
import type { RuntimeContext } from '../src/framework/types.ts';
import { setCliTokenManual, clearCliToken, localRenewDate } from '../src/core/cli-token.ts';
import { markCredentialRenewed } from '../src/core/secure-store.ts';

const host = 'https://community-spaces-count.example.invalid';
const sandbox = mkdtempSync(join(tmpdir(), 'community-spaces-count-'));
const previousFetch = globalThis.fetch;
const previousSandbox = process.env.SANDBOX_RUNTIME_ROOT;
const previousDomain = process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_COMMUNITY;
const previousGlobalDomain = process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
const ctx = { host: () => host } as RuntimeContext;
const spaces = Array.from({ length: 18 }, (_, index) => ({
  spaceId: (1940327799817117696n + BigInt(index)).toString(),
  name: `Space ${index + 1}`,
  companyId: 7,
  roleName: index % 2 === 0 ? 'sl_root' : 'member',
}));
let calls = 0;
let responseBody: unknown;
let responseStatus = 200;

mkdirSync(join(sandbox, '.ae-config'));
writeFileSync(join(sandbox, '.ae-config', 'cli-token.json'),
  JSON.stringify({ url: host, token: 'test-only-community-spaces-count' }));
process.env.SANDBOX_RUNTIME_ROOT = sandbox;
setCliTokenManual('test-only-community-spaces-count', host);
markCredentialRenewed(host, 'test-only-community-spaces-count', localRenewDate());
delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_COMMUNITY;
delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
registerCapabilityGatewayRoute('community', { gatewayDomain: 'community' });
globalThis.fetch = (async (url, init) => {
  calls += 1;
  assert.equal(String(url), `${host}/api/cli/community/v1/capabilities/community.space.list/execute`);
  assert.equal(init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(init?.body)).input, {});
  assert.equal(new Headers(init?.headers).get('cli-token'), 'test-only-community-spaces-count');
  return new Response(JSON.stringify(responseBody), { status: responseStatus });
}) as typeof fetch;

async function execute(body: unknown, status = 200) {
  calls = 0;
  responseBody = body;
  responseStatus = status;
  return communitySpacesList.execute(ctx);
}

try {
  const counted = await execute({ ok: true, data: spaces });
  const output = JSON.parse(await formatOutput(counted, 'json'));
  assert.equal(calls, 1);
  assert.equal(output.ok, true);
  assert.deepEqual(output.data, spaces, 'Keep the original array, order, full IDs, and roles');
  assert.deepEqual(output.meta, { returned_count: 18 }, 'Expose count when the server has no metadata');

  const serverMeta = { returned_count: 19, total: 50, request_id: 'fixture-spaces' };
  const conflicted = JSON.parse(await formatOutput(await execute({
    ok: true, data: spaces, meta: serverMeta,
  }), 'json'));
  assert.deepEqual(conflicted.data, spaces);
  assert.deepEqual(conflicted.meta, { ...serverMeta, returned_count: 18 });
  assert.equal(serverMeta.returned_count, 19, 'Do not mutate the server fixture');
  assert.equal(calls, 1);

  const projected = JSON.parse(await formatOutput(counted, 'json', '.[0:1]'));
  assert.deepEqual(projected.data, [spaces[0]]);
  assert.equal(projected.meta.returned_count, 18, 'Count the original response before jq');

  const empty = JSON.parse(await formatOutput(await execute({ ok: true, data: [] }), 'json'));
  assert.deepEqual(empty, { ok: true, data: [], meta: { returned_count: 0 } });
  assert.equal(calls, 1);

  const duplicates = JSON.parse(await formatOutput(await execute({
    ok: true, data: [spaces[0], spaces[0]],
  }), 'json'));
  assert.deepEqual(duplicates.data, [spaces[0], spaces[0]]);
  assert.equal(duplicates.meta.returned_count, 2, 'Do not deduplicate entries');

  const nonArray = { original: 'unchanged' };
  const compatible = await execute({ ok: true, data: nonArray, meta: { request_id: 'legacy' } });
  const compatibleOutput = JSON.parse(await formatOutput(compatible, 'json'));
  assert.deepEqual(compatibleOutput.data, nonArray);
  assert.deepEqual(compatibleOutput.meta, { request_id: 'legacy' });

  for (const failure of [
    { status: 401, error: { code: 'INVALID_CLI_TOKEN', message: 'Authentication fixture failed' },
      check: (error: unknown) => error instanceof SecureStoreAuthError },
    { status: 403, error: { code: 'AUTHORITY_FORBIDDEN', message: 'Space access denied' },
      check: (error: unknown) => error instanceof PermissionError && error.code === 'AUTHORITY_FORBIDDEN' },
    { status: 200, error: { code: 'CAPABILITY_NOT_FOUND', message: 'Capability not deployed' },
      check: (error: unknown) => error instanceof CapabilityGatewayError && error.code === 'CAPABILITY_NOT_FOUND' },
  ]) {
    await assert.rejects(execute({ ok: false, error: failure.error }, failure.status), failure.check);
    assert.equal(calls, 1, 'Preserve failures without retrying or converting them to zero spaces');
  }
  process.stdout.write('community spaces count mock tests passed\n');
} finally {
  globalThis.fetch = previousFetch;
  clearCliToken(host);
  for (const [key, value] of [
    ['SANDBOX_RUNTIME_ROOT', previousSandbox],
    ['AE_CLI_CAPABILITY_GATEWAY_DOMAIN_COMMUNITY', previousDomain],
    ['AE_CLI_CAPABILITY_GATEWAY_DOMAIN', previousGlobalDomain],
  ]) {
    if (value === undefined) delete process.env[key!];
    else process.env[key!] = value;
  }
  rmSync(sandbox, { recursive: true, force: true });
}
