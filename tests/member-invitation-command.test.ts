import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import analysis, { baseCommands } from '../src/commands/te-analysis/index.js';
import { sendMemberInvitation } from '../src/commands/te-analysis/member-invitation/send.js';
import { CapabilityGatewayError } from '../src/core/capability-api.js';
import { clearCliTokenCache } from '../src/core/cli-token.js';
import { CliValidationError, PermissionError } from '../src/core/errors.js';
import type { RuntimeContext } from '../src/framework/types.js';

const host = 'https://invite-test.invalid';
const target = `${host}/api/cli/analysis/v1/capabilities/analysis.member_invitation.send/execute`;
const requestId = '04daab9f-9424-49d8-99c8-a7ace9535bc1';

function context(overrides: Record<string, string> = {}): RuntimeContext {
  const flags: Record<string, string> = {
    email: ' TeamMate@Example.Com ',
    'project-id': '42',
    'project-role': 'viewer',
    'request-id': requestId,
    ...overrides,
  };
  return {
    host: () => host,
    str: (key) => flags[key] ?? '',
  } as RuntimeContext;
}

test('The onboarding command registers and dry-run validates without exposing the email', async () => {
  assert.ok(analysis.includes(sendMemberInvitation));
  assert.ok(!baseCommands.includes(sendMemberInvitation));
  assert.equal(sendMemberInvitation.risk, 'write');
  assert.equal(sendMemberInvitation.flags.find((flag) => flag.name === 'email')?.sensitive, true);
  const request = await sendMemberInvitation.dryRun!(context());
  assert.equal(request.method, 'POST');
  assert.equal(request.url, target);
  assert.deepEqual(request.body, {
    input: { email: '[REDACTED]', project_id: '42', project_role: 'viewer', request_id: requestId },
  });
  const invalidInputs: Record<string, string>[] = [
    { email: 'no email' },
    { email: `${'x'.repeat(100)}@example.com` },
    { 'project-id': '2147483648' },
    { 'project-id': '0042' },
    { 'project-role': ' ' },
    { 'request-id': 'invalid' },
  ];
  for (const invalid of invalidInputs) {
    assert.throws(() => sendMemberInvitation.dryRun!(context(invalid)), CliValidationError);
  }
});

test('Send preserves request identity, forbids redirects, and distinguishes old hosts and failed sends', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ae-cli-member-invitations-'));
  const token = 'cli_mock_invitation_token';
  const keys = ['SANDBOX_RUNTIME_ROOT', 'AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE'];
  const previousEnv = new Map(keys.map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  let reply = () => Response.json({ ok: true, data: { sent: true } });
  try {
    mkdirSync(join(root, '.ae-config'));
    writeFileSync(join(root, '.ae-config', 'cli-token.json'), JSON.stringify({ url: host, token }));
    process.env.SANDBOX_RUNTIME_ROOT = root;
    delete process.env.AE_CLI_TOKEN;
    delete process.env.AE_CLI_TOKEN_HOST;
    delete process.env.AE_CLI_TOKEN_FILE;
    globalThis.fetch = async (url, init) => {
      if (String(url) === `${host}/v1/ta/cli/token/renew`) return new Response('{}', { status: 404 });
      assert.equal(String(url), target);
      assert.ok(init);
      assert.equal(init.method, 'POST');
      assert.equal(init.redirect, 'error');
      const headers = new Headers(init.headers);
      assert.equal(headers.get('cli-token'), token);
      assert.equal(headers.has('authorization'), false);
      const body = JSON.parse(String(init.body));
      assert.deepEqual(Object.keys(body), ['input']);
      requests.push(body.input);
      return reply();
    };

    assert.deepEqual(await sendMemberInvitation.execute(context()), { sent: true, request_id: requestId });
    assert.deepEqual(requests[0], {
      request_id: requestId, email: 'teammate@example.com', project_id: '42', project_role: 'viewer',
    });

    reply = () => Response.json({ ok: false, error: {
      type: 'service_unavailable', code: 'MEMBER_INVITATION_UNAVAILABLE', message: 'Sending could not be confirmed.',
    } }, { status: 503 });
    await assert.rejects(() => sendMemberInvitation.execute(context()), (error) =>
      error instanceof CapabilityGatewayError && error.code === 'MEMBER_INVITATION_UNAVAILABLE'
      && error.hint?.includes(requestId) === true);
    assert.deepEqual(requests[1], requests[0]);
    assert.equal(requests.length, 2);

    reply = () => new Response('Not found', { status: 404 });
    await assert.rejects(() => sendMemberInvitation.execute(context()), (error) =>
      error instanceof CapabilityGatewayError && error.code === 'MEMBER_INVITATION_UNAVAILABLE');
    reply = () => Response.json({ ok: false, error: {
      type: 'permission', code: 'member_invitation_forbidden', message: 'Company admin required.',
    } }, { status: 403 });
    await assert.rejects(() => sendMemberInvitation.execute(context()), PermissionError);

    reply = () => Response.json({ ok: true, data: { sent: false } });
    await assert.rejects(() => sendMemberInvitation.execute(context()), (error) =>
      error instanceof CapabilityGatewayError && error.code === 'INVITATION_INVALID_RESPONSE');

    reply = () => Response.json({ ok: true, data: { sent: true } });
    const generated = await sendMemberInvitation.execute(context({ 'request-id': '' }));
    assert.match(generated.request_id, /^[0-9a-f-]{36}$/);
    assert.equal(requests[5].request_id, generated.request_id);
    assert.equal(requests.length, 6);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliTokenCache(host);
    for (const [key, value] of previousEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  }
});
