import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

function run(home: string, args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...args], {
      env: { ...process.env, HOME: home, AE_CLI_NO_COMPAT_CHECK: '1', TE_CLAUDE_BASE_PATH: '/agent' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

for (const legacy of [false, true]) {
  test(`${legacy ? 'legacy server' : 'UBA server'} split login preserves the public command and saves only CLI credentials`, async () => {
    const home = mkdtempSync(join(tmpdir(), 'ae-cli-device-command-'));
    const paths: string[] = [];
    const origins: Array<{ path: string; value: string | string[] | undefined }> = [];
    const deviceCode = legacy ? 'legacy-session-uuid' : 'uba_random-session';
    const authPrefix = legacy ? '/agent/api/auth/device' : '/v1/ta/cli/auth/device';
    const server = http.createServer(async (request, response) => {
      const url = new URL(request.url!, 'http://localhost');
      paths.push(url.pathname);
      origins.push({ path: url.pathname, value: request.headers['x-cli-verification-origin'] });
      response.setHeader('Content-Type', 'application/json');
      if (legacy && url.pathname === '/v1/ta/cli/auth/device/authorize') {
        response.writeHead(404).end('{}'); return;
      }
      if (url.pathname === `${authPrefix}/authorize`) {
        response.end(JSON.stringify({ device_code: deviceCode, user_code: 'ABCD-EFGH',
          interval: 5, expires_in: 300, verification_uri: 'https://untrusted.test',
          verification_uri_complete: 'https://untrusted.test/?user_code=ABCD-EFGH' })); return;
      }
      if (url.pathname === `${authPrefix}/token`) {
        let body = '';
        for await (const chunk of request) body += chunk;
        assert.equal(JSON.parse(body).device_code, deviceCode);
        response.end(JSON.stringify({ access_token: 'access-secret-must-not-persist',
          refresh_token: 'refresh-secret-must-not-persist', token_type: 'bearer', expires_in: 300 })); return;
      }
      if (url.pathname === '/v1/ta/cli/token/generate') {
        assert.equal(request.headers.authorization, 'bearer access-secret-must-not-persist');
        response.end(JSON.stringify({ return_code: 0, data: { userSecret: 'cli_command_result' } })); return;
      }
      if (url.pathname === '/v1/ta/cli/token/validate') {
        response.end(JSON.stringify({ return_code: 0, data: { openId: 'open-a', loginName: 'alice', userName: 'Alice' } })); return;
      }
      response.writeHead(500).end('{}');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const host = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      const started = await run(home, ['auth', 'login', '--host', host, '--no-browser', '--no-wait']);
      assert.equal(started.code, 0, started.stderr);
      const data = JSON.parse(started.stdout).data;
      assert.equal(data.device_code, deviceCode);
      assert.deepEqual(origins, legacy
        ? [
          { path: '/v1/ta/cli/auth/device/authorize', value: host },
          { path: '/agent/api/auth/device/authorize', value: undefined },
        ]
        : [{ path: '/v1/ta/cli/auth/device/authorize', value: host }]);
      assert.ok(data.next.includes(`--host '${host}' --device-code '${deviceCode}'`));
      assert.equal(data.verification_url, legacy
        ? `${host}/agent/device-activate?user_code=ABCD-EFGH`
        : `${host}/#/cli/device-activate?user_code=ABCD-EFGH`);
      const resumed = await run(home, ['auth', 'login', '--host', host, '--device-code', deviceCode, '--add']);
      assert.equal(resumed.code, 0, resumed.stderr);
      assert.equal(JSON.parse(resumed.stdout).data.account.login_name, 'alice');
      assert.ok(origins.filter(({ path }) => !path.endsWith('/authorize')).every(({ value }) => value === undefined));
      assert.ok(paths.includes(`${authPrefix}/token`));
      assert.ok(!paths.includes('/v1/ta/cli/deployment/status'));
      if (!legacy) assert.ok(paths.every((path) => !path.startsWith('/agent')));
      const logs = readdirSync(join(home, '.ae-cli/log')).map((path) => readFileSync(join(home, '.ae-cli/log', path), 'utf8')).join('');
      assert.doesNotMatch(logs + resumed.stdout + resumed.stderr, /access-secret|refresh-secret|uba_random-session|ABCD-EFGH/);
      const status = await run(home, ['auth', 'status', '--host', host]);
      assert.equal(status.code, 0, status.stderr);
      assert.equal(JSON.parse(status.stdout).data.authenticated, true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      rmSync(home, { recursive: true, force: true });
    }
  });
}
