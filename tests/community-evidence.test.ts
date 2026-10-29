import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { communityEvidenceFetch, communityEvidenceFetchAlias } from '../src/commands/te-community/evidence-fetch.ts';
import communityCommands from '../src/commands/te-community/index.ts';
const communitySourcesList = communityCommands.find(c => c.resource === 'sources' && c.command === 'list')!;
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RuntimeContext } from '../src/framework/types.ts';
import { setCliTokenManual, clearCliToken, localRenewDate } from '../src/core/cli-token.ts';
import { markCredentialRenewed } from '../src/core/secure-store.ts';

const host = 'https://community-evidence.example.invalid';
const channel = '1940327799817117696';
const item = { channel_id: channel, uuid: 'post-1', resource_type: 0 };
const ctx = (input: unknown, maxChars = 100000): RuntimeContext => ({
  str: (name: string) => name === 'input' ? JSON.stringify(input) : '',
  int64: () => 1940327799817117697n,
  optionalNum: () => maxChars,
  host: () => host,
} as RuntimeContext);
const previousFetch = globalThis.fetch;
let calls: { url: string; body: string }[] = [];
const sandbox = mkdtempSync(join(tmpdir(), 'community-evidence-'));
const oldSandbox = process.env.SANDBOX_RUNTIME_ROOT;
const oldCommunityDomain = process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_COMMUNITY;
const oldGatewayDomain = process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
process.env.SANDBOX_RUNTIME_ROOT = sandbox;
mkdirSync(join(sandbox, '.ae-config'));
writeFileSync(join(sandbox, '.ae-config', 'cli-token.json'), JSON.stringify({ url: host, token: 'test-only-community-evidence' }));
setCliTokenManual('test-only-community-evidence', host);
markCredentialRenewed(host, 'test-only-community-evidence', localRenewDate());
globalThis.fetch = (async (url, init) => {
  calls.push({ url: String(url), body: String(init?.body) });
  return new Response(JSON.stringify({ ok: true, data: {
    channel_id: channel, uuid: 'post-1', resource_type: 'POST',
    content: '完整原文：很卡。', subtitle: ['请修复'], title: '反馈',
  }, meta: { request_id: 'fixture-1' } }));
}) as typeof fetch;
try {
  assert.equal(communityEvidenceFetch.resource, 'evidence');
  assert.equal(communityEvidenceFetch.command, 'fetch');
  assert.equal(communityEvidenceFetchAlias.command, '+fetch-evidence');
  assert.equal(communityEvidenceFetchAlias.resource, undefined);
  for (const key of ['execute', 'dryRun', 'flags', 'risk'] as const) {
    assert.equal(communityEvidenceFetchAlias[key], communityEvidenceFetch[key], `Alias must preserve ${key}`);
  }
  assert.ok(communityCommands.includes(communityEvidenceFetch));
  assert.ok(communityCommands.includes(communityEvidenceFetchAlias));
  delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
  for (const route of [
    { domain: undefined, path: '/api/cli/community/v1' },
    { domain: '', path: '/api/cli/v1' },
    { domain: 'custom-community', path: '/api/cli/custom-community/v1' },
  ]) {
    if (route.domain === undefined) delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_COMMUNITY;
    else process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_COMMUNITY = route.domain;
    calls = [];
    const preview = await communityEvidenceFetch.dryRun!(ctx({ items: [item] }));
    assert.equal(preview.url, `${host}${route.path}/capabilities/community.content.post_detail/execute`);
    assert.equal(calls.length, 0, 'Gateway routing preview must stay local');
    const evidence = await communityEvidenceFetch.execute(ctx({ items: [item] }));
    assert.equal(calls.length, 1, 'Fetch evidence once using the configured gateway route');
    assert.equal(calls[0].url, preview.url, 'Gateway preview and HTTP execution must use the same route');
    assert.equal(evidence.items[0].status, 'ok');
  }
  delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_COMMUNITY;
  calls = [];
  await communitySourcesList.execute(ctx({}));
  assert.match(calls[0].url, /community\.source\.list\/execute$/);
  assert.match(calls[0].body, /1940327799817117697/);
  calls = [];
  const result = await communityEvidenceFetch.execute(ctx({ items: [item, item] }));
  assert.equal(calls.length, 1, 'Duplicate evidence must be fetched once');
  assert.match(calls[0].url, /community\.content\.post_detail\/execute$/);
  assert.match(calls[0].body, /"game_id":1940327799817117697/);
  assert.match(calls[0].body, /"channel_id":1940327799817117696/);
  assert.equal(result.requested, 2);
  assert.equal(result.unique, 1);
  assert.equal(result.items[0].status, 'ok');
  assert.equal(result.items[0].text.content, '完整原文：很卡。');
  assert.equal(result.items[0].quality.text_truncated, false);
  assert.equal(result.items[0].meta.request_id, 'fixture-1');
  assert.equal(result.quality.dataset_complete, false);
  calls = [];
  await assert.rejects(communityEvidenceFetch.execute(ctx({ items: [item, { ...item, resource_type: 5 }] })), /resource_type/);
  assert.equal(calls.length, 0, 'Validate the entire batch before any network call');
  await assert.rejects(communityEvidenceFetch.execute(ctx({ items: [{ ...item, game_id: 2 }] })), /only/);
  await assert.rejects(communityEvidenceFetch.execute(ctx({ items: Array(21).fill(item) })), /1 to 20/);
  await assert.rejects(communityEvidenceFetch.execute(ctx({ items: [{ ...item, channel_id: '9223372036854775808' }] })), /int64/);
  const preview = await communityEvidenceFetch.dryRun!(ctx({ items: [item, item] }));
  assert.equal(preview.body.unique, 1);
  assert.doesNotThrow(() => JSON.stringify(preview), 'Dry run must be renderable JSON');
  assert.equal(calls.length, 0, 'Dry run must stay local');

  const budget = await communityEvidenceFetch.execute(ctx({ items: [item, { ...item, uuid: 'post-2' }] }, 4));
  assert.equal(budget.items[0].quality.text_truncated, true);
  assert.equal(budget.items[1].status, 'not_fetched');
  assert.equal(budget.items[1].reason, 'text_budget_exhausted');
  assert.equal(budget.quality.returned_chars, 4);
  assert.equal(calls.length, 1, 'Stop fetching after the text budget is consumed');

  calls = [];
  globalThis.fetch = (async (_url, init) => {
    const uuid = JSON.parse(String(init?.body)).input.uuid;
    if (uuid === 'post-1') return new Response(JSON.stringify({ ok: true, data: { channel_id: channel, uuid: 'wrong-post', resource_type: 'POST', content: 'Wrong private body' } }));
    if (uuid === 'post-2') return new Response(JSON.stringify({ ok: false, error: { code: 'QUERY_FAILED', message: 'private upstream details' } }));
    return new Response(JSON.stringify({ ok: true, data: null }));
  }) as typeof fetch;
  const partial = await communityEvidenceFetch.execute(ctx({ items: [item, { ...item, uuid: 'post-2' }, { ...item, uuid: 'post-3' }] }));
  assert.deepEqual(partial.items.map((entry: any) => entry.status), ['invalid_response', 'error', 'missing']);
  assert.equal(partial.quality.batch_complete, false);
  assert.doesNotMatch(JSON.stringify(partial), /Wrong private body|private upstream details/);
  assert.equal(partial.items[1].error.code, 'QUERY_FAILED');
  globalThis.fetch = (async () => new Response(JSON.stringify({ ok: true, data: {
    channelId: channel, uuid: 'post-1', resourceType: 'POST', content: '😀很卡', title: null, subtitle: null,
    redNoteUrl: 'javascript:do-not-execute()',
  } }))) as typeof fetch;
  const unicode = await communityEvidenceFetch.execute(ctx({ items: [item] }, 2));
  assert.equal(unicode.items[0].text.content, '😀很');
  assert.equal(unicode.items[0].quality.text_fields.content.original_chars, 3);
  assert.equal(unicode.items[0].quality.text_fields.subtitle.status, 'missing');
  assert.equal(unicode.items[0].source_url, null);
  let forbiddenCalls = 0;
  globalThis.fetch = (async () => {
    forbiddenCalls++;
    return new Response(JSON.stringify({ error: { code: 'NO_ACCESS', message: 'forbidden' } }), { status: 403 });
  }) as typeof fetch;
  const denied = await communityEvidenceFetch.execute(ctx({ items: [item, { ...item, uuid: 'post-2' }] }));
  assert.equal(denied.items[0].error.type, 'permission');
  assert.equal(denied.items[1].status, 'not_fetched');
  assert.equal(forbiddenCalls, 1, 'Do not continue probing after access is denied');
  forbiddenCalls = 0;
  globalThis.fetch = (async () => {
    forbiddenCalls++;
    return new Response(JSON.stringify({ ok: false, error: { code: 'NO_ACCESS', http_status: 403, message: 'forbidden' } }));
  }) as typeof fetch;
  const deniedEnvelope = await communityEvidenceFetch.execute(ctx({ items: [item, { ...item, uuid: 'post-2' }] }));
  assert.equal(deniedEnvelope.items[0].error.type, 'permission');
  assert.equal(deniedEnvelope.items[1].reason, 'access_denied');
  assert.equal(forbiddenCalls, 1, 'Envelope permission errors must stop the batch as HTTP errors do');

  forbiddenCalls = 0;
  globalThis.fetch = (async () => {
    forbiddenCalls++;
    return new Response(JSON.stringify({ error: { message: 'Your token is invalid. Please verify your token and try again.' } }), { status: 403 });
  }) as typeof fetch;
  const invalidToken = await communityEvidenceFetch.execute(ctx({ items: [item, { ...item, uuid: 'post-2' }] }));
  assert.equal(invalidToken.items[0].error.type, 'auth');
  assert.equal(invalidToken.items[0].error.code, 'AUTH_REQUIRED');
  assert.equal(invalidToken.items[1].reason, 'access_denied');
  assert.equal(forbiddenCalls, 1, 'A 403 must not trigger credential refresh or a second evidence request');

  const inputFile = join(sandbox, 'evidence.json');
  writeFileSync(inputFile, JSON.stringify({ items: [item] }));
  const cliPreview = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check',
    '--host', host, '--dry-run', 'community', '+fetch-evidence', '--space-id', '1940327799817117697', '--input', `@${inputFile}`], { encoding: 'utf8' });
  assert.equal(cliPreview.status, 0, cliPreview.stderr);
  assert.equal(JSON.parse(cliPreview.stdout).data.body.inputs[0].game_id, '1940327799817117697');
  const canonicalPreview = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check',
    '--host', host, '--dry-run', 'community', 'evidence', 'fetch', '--space-id', '1940327799817117697', '--input', `@${inputFile}`], { encoding: 'utf8' });
  assert.equal(canonicalPreview.status, 0, canonicalPreview.stderr);
  assert.deepEqual(JSON.parse(canonicalPreview.stdout).data, JSON.parse(cliPreview.stdout).data,
    'Canonical command and compatibility alias must preview identical requests');
  const stdinPreview = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check',
    '--host', host, '--dry-run', 'community', '+fetch-evidence', '--space-id', '1940327799817117697', '--input', '-'],
    { input: JSON.stringify({ items: [item] }), encoding: 'utf8' });
  assert.equal(stdinPreview.status, 0, stdinPreview.stderr);
  assert.deepEqual(JSON.parse(stdinPreview.stdout).data, JSON.parse(cliPreview.stdout).data);
  console.log('community evidence contract: passed');
} finally {
  globalThis.fetch = previousFetch;
  clearCliToken(host);
  if (oldSandbox === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
  else process.env.SANDBOX_RUNTIME_ROOT = oldSandbox;
  if (oldCommunityDomain === undefined) delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_COMMUNITY;
  else process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN_COMMUNITY = oldCommunityDomain;
  if (oldGatewayDomain === undefined) delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
  else process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN = oldGatewayDomain;
  rmSync(sandbox, { recursive: true, force: true });
}
