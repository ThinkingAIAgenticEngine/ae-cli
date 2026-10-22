import assert from 'node:assert/strict';
import { requestSandboxEvaluationSession } from '../src/core/eval-session.ts';

let capturedUrl = '';
let capturedHeaders = new Headers();
let capturedBody = '';
const token = await requestSandboxEvaluationSession(
  'https://ae.example.com',
  'cli_secret',
  'project-1',
  async (input, init) => {
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal instanceof AbortSignal);
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);
    capturedBody = String(init?.body);
    return new Response(JSON.stringify({ session_token: 'evaluation-session', expires_in: 900 }), { status: 200 });
  },
);
assert.equal(token, 'evaluation-session');
assert.equal(capturedUrl, 'https://ae.example.com/agent/api/sandbox/agent/evaluation/session');
assert.equal(capturedHeaders.get('cli-token'), 'cli_secret');
assert.equal(capturedBody, JSON.stringify({ te_project_id: 'project-1' }));

await assert.rejects(
  () => requestSandboxEvaluationSession('https://ae.example.com/agent', 'cli_secret', undefined, async () => new Response(JSON.stringify({ error: 'denied' }), { status: 403 })),
  (error: any) => error?.code === 'EVAL_SANDBOX_SESSION_FAILED' && error?.message === 'denied',
);

console.log('evaluation sandbox session tests passed');

// Reject invalid protocols and loopback hosts before sending credentials.
for (const host of ['ftp://ae.example.com', 'https://[::1]']) {
  let requests = 0;
  await assert.rejects(requestSandboxEvaluationSession(host, 'synthetic-cli-token', undefined, async () => {
    requests++; return new Response('{}');
  }), (e: any) => e.code === 'EVAL_ENDPOINT_INVALID' || e.code === 'EVAL_ENDPOINT_LOOPBACK_UNSUPPORTED');
  assert.equal(requests, 0);
}
await assert.rejects(requestSandboxEvaluationSession('https://ae.example.com', 'synthetic-cli-token', undefined, async (_url, init) => {
  assert.equal(init?.redirect, 'error');
  throw new TypeError('redirect rejected');
}), (e: any) => e.code === 'EVAL_SANDBOX_SESSION_NETWORK_ERROR');
console.log('evaluation session transport security tests passed');

// Session exchange follows the selected AE Host protocol, including HTTP installations.
for (const protocol of ['http', 'https']) {
  assert.equal(await requestSandboxEvaluationSession(`${protocol}://ae.example.com/agent`, 'synthetic-cli-token', undefined, async (input, init) => {
    assert.equal(String(input), `${protocol}://ae.example.com/agent/api/sandbox/agent/evaluation/session`);
    assert.equal(init?.redirect, 'error');
    return new Response(JSON.stringify({ session_token: 'synthetic-session' }));
  }), 'synthetic-session');
}
