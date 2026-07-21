import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temporaryHome = mkdtempSync(join(tmpdir(), 'ae-community-report-client-'));
process.env.HOME = temporaryHome;

const { communityReport, CommunityReportError } = await import('../src/core/community-report-client.js');

const secretRequest = 'UNIQUE_COMMUNITY_REQUEST_BODY_6b2ca3';
const secretResponse = 'UNIQUE_IRIS_RESPONSE_STACK_9af014';
const requests: Array<{ url: string; headers: IncomingMessage['headers']; body: string }> = [];

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString('utf8');
  requests.push({ url: req.url ?? '', headers: req.headers, body });

  switch (req.url) {
    case '/sync_content':
      json(res, 200, { return_code: 0, return_message: 'success' });
      break;
    case '/bad-request':
      json(res, 400, { return_code: 1003, return_message: 'invalid source id' });
      break;
    case '/buffer-full':
      json(res, 400, { return_code: 1004, return_message: 'buffer is full' });
      break;
    case '/server-error':
      json(res, 500, { return_code: 9999, return_message: secretResponse });
      break;
    case '/non-json':
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('not json');
      break;
    case '/missing-code':
      json(res, 200, { return_message: 'success' });
      break;
    case '/legacy-envelope':
      json(res, 200, { code: 0, message: 'success' });
      break;
    case '/business-error':
      json(res, 200, { return_code: 2301, return_message: 'business rejection' });
      break;
    case '/redirect':
      res.writeHead(302, { location: '/sync_content' });
      res.end();
      break;
    case '/timeout':
      setTimeout(() => json(res, 200, { return_code: 0, return_message: 'late success' }), 120);
      break;
    case '/body-timeout':
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"return_code":0');
      setTimeout(() => res.end(',"return_message":"late success"}'), 120);
      break;
    default:
      res.writeHead(404);
      res.end();
  }
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  let injectedInit: RequestInit | undefined;
  let injectedCalls = 0;
  await communityReport('https://iris.example.test/sync_content', '{"probe":true}', {
    fetchImpl: (async (_input: RequestInfo | URL, init?: RequestInit) => {
      injectedCalls += 1;
      injectedInit = init;
      return new Response('{"return_code":0,"return_message":"success"}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch,
  });
  assert.equal(injectedCalls, 1);
  assert.equal(injectedInit?.method, 'POST');
  assert.equal(injectedInit?.redirect, 'error');
  assert.deepEqual(injectedInit?.headers, {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });

  const maxInt64Body = `{"custom_data":{"game_id":9223372036854775807},"payload":[],"marker":"${secretRequest}"}`;
  const success = await communityReport(`${baseUrl}/sync_content`, maxInt64Body);
  assert.equal(success.return_code, 0);
  assert.equal(success.http_status, 200);
  assert.equal(success.request_bytes, Buffer.byteLength(maxInt64Body));

  const first = requests.at(0);
  assert(first);
  assert.equal(first.body, maxInt64Body);
  assert.match(first.body, /9223372036854775807/);
  assert.doesNotMatch(first.body, /"9223372036854775807"/);
  assert.equal(first.headers.accept, 'application/json');
  assert.match(first.headers['content-type'] ?? '', /^application\/json/);
  assert.equal(first.headers.authorization, undefined);
  assert.equal(first.headers['cli-token'], undefined);
  assert.equal(first.headers['access-token'], undefined);
  assert.equal(first.headers['x-source'], undefined);

  await expectCommunityError(`${baseUrl}/bad-request`, 'invalid source id', 1003);
  await expectCommunityError(`${baseUrl}/buffer-full`, 'buffer is full', 1004);

  const serverError = await captureCommunityError(`${baseUrl}/server-error`);
  assert.equal(serverError.httpStatus, 500);
  assert.doesNotMatch(serverError.message, new RegExp(secretResponse));
  assert.match(serverError.message, /HTTP 500/);

  await expectCommunityError(`${baseUrl}/non-json`, 'non-JSON API response', 'COMMUNITY_REPORT_INVALID_RESPONSE');
  await expectCommunityError(`${baseUrl}/missing-code`, 'missing numeric return_code', 'COMMUNITY_REPORT_INVALID_RESPONSE');
  await expectCommunityError(`${baseUrl}/legacy-envelope`, 'missing numeric return_code', 'COMMUNITY_REPORT_INVALID_RESPONSE');
  await expectCommunityError(`${baseUrl}/business-error`, 'business rejection', 2301);

  const beforeRedirect = requests.length;
  const redirectError = await captureCommunityError(`${baseUrl}/redirect`);
  assert.equal(redirectError.code, 'COMMUNITY_REPORT_NETWORK_ERROR');
  assert.equal(requests.length, beforeRedirect + 1, 'redirect must not be followed or retried');

  const beforeTimeout = requests.length;
  const timeoutError = await captureCommunityError(`${baseUrl}/timeout`, 20);
  assert.equal(timeoutError.code, 'COMMUNITY_REPORT_TIMEOUT');
  assert.match(timeoutError.message, /Delivery state is unknown/);
  assert.match(timeoutError.hint ?? '', /Check downstream query or storage/);
  assert.equal(timeoutError.meta?.retry_attempted, false);
  assert.equal(requests.length, beforeTimeout + 1, 'timeout must issue one POST only');

  const beforeBodyTimeout = requests.length;
  const bodyTimeoutError = await captureCommunityError(`${baseUrl}/body-timeout`, 20);
  assert.equal(bodyTimeoutError.code, 'COMMUNITY_REPORT_TIMEOUT');
  assert.equal(requests.length, beforeBodyTimeout + 1, 'response-body timeout must not retry');

  const logDir = join(temporaryHome, '.ae-cli', 'log');
  const logs = readdirSync(logDir)
    .map((name) => readFileSync(join(logDir, name), 'utf8'))
    .join('\n');
  assert.doesNotMatch(logs, new RegExp(secretRequest));
  assert.doesNotMatch(logs, new RegExp(secretResponse));
  assert.match(logs, /COMMUNITY_REPORT POST/);
  assert.match(logs, /request_bytes=/);
  assert.match(logs, /response_bytes=/);

  process.stdout.write('OK: community report client is single-shot, unauthenticated, lossless, and body-safe.\n');
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  rmSync(temporaryHome, { recursive: true, force: true });
}

async function expectCommunityError(
  endpoint: string,
  messagePattern: string,
  code: string | number,
): Promise<void> {
  const error = await captureCommunityError(endpoint);
  assert.match(error.message, new RegExp(messagePattern));
  assert.equal(error.code, code);
}

async function captureCommunityError(endpoint: string, timeoutMs?: number): Promise<InstanceType<typeof CommunityReportError>> {
  try {
    await communityReport(endpoint, '{"safe":true}', timeoutMs === undefined ? {} : { timeoutMs });
    assert.fail('Expected CommunityReportError');
  } catch (error) {
    assert(error instanceof CommunityReportError);
    return error;
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
