import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { waitForAnalysisRun, downloadAnalysisArtifact } from '../src/core/analysis-async-artifact.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { registerCapabilityGatewayRoute } from '../src/core/capability-routing.ts';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';

registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });

async function delayedGateway(delayMs: number, run: (host: string) => Promise<void>) {
  const server = createServer((_request, response) => {
    const timer = setTimeout(() => response.end(JSON.stringify({
      ok: true, data: { run_id: 'run_test', artifact_id: 'artifact_test', status: 'SUCCEEDED', artifact_status: 'COMPLETED' },
    })), delayMs);
    response.on('close', () => clearTimeout(timer));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  setCliTokenManual('synthetic-test-token', host);
  try {
    await run(host);
  } finally {
    clearCliToken(host);
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('interrupting an active inspect rejects rather than accepting its late success', async () => {
  await delayedGateway(500, async (host) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30);
    try {
      await assert.rejects(waitForAnalysisRun(host, 'run_test', { signal: controller.signal }),
        { code: 'ASYNC_WAIT_INTERRUPTED' });
    } finally {
      clearTimeout(timer);
    }
  });
});

test('the local wait bound aborts an active inspect and retains a resume hint', async () => {
  await delayedGateway(1400, async (host) => {
    await assert.rejects(waitForAnalysisRun(host, 'run_test', { waitTimeoutSeconds: 1 }), (error: any) => {
      assert.equal(error.code, 'ASYNC_WAIT_TIMEOUT');
      assert.equal(error.meta.remote_run_canceled, false);
      assert.match(error.hint, /run_test/);
      return true;
    });
  });
});

test('a late terminal result cannot bypass an elapsed client deadline', async () => {
  let now = 0;
  await assert.rejects(waitForAnalysisRun('https://unused.example.invalid', 'run_test', {
    now: () => now,
    waitTimeoutSeconds: 1,
    inspect: async () => {
      now = 2000;
      return { run_id: 'run_test', artifact_id: 'artifact_test', status: 'SUCCEEDED', artifact_status: 'COMPLETED' };
    },
  }), { code: 'ASYNC_WAIT_TIMEOUT' });
});

test('transient retry backoff is capped by the remaining wait bound', async () => {
  let now = 0;
  const sleeps: number[] = [];
  await assert.rejects(waitForAnalysisRun('https://unused.example.invalid', 'run_test', {
    now: () => now,
    waitTimeoutSeconds: 1,
    inspect: async () => {
      now = 900;
      throw new CapabilityGatewayError('Temporarily unavailable', 'UNAVAILABLE', 503);
    },
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
      now += milliseconds;
    },
  }), { code: 'ASYNC_WAIT_TIMEOUT' });
  assert.deepEqual(sleeps, [100]);
});

test('waiting supports Node 20 runtimes without AbortSignal.any', async () => {
  const originalAny = AbortSignal.any;
  try {
    Object.defineProperty(AbortSignal, 'any', { value: undefined, configurable: true });
    const result = await waitForAnalysisRun('https://unused.example.invalid', 'run_test', {
      signal: new AbortController().signal,
      inspect: async () => ({ run_id: 'run_test', artifact_id: 'artifact_test', status: 'SUCCEEDED', artifact_status: 'COMPLETED' }),
    });
    assert.equal(result.status, 'SUCCEEDED');
  } finally {
    Object.defineProperty(AbortSignal, 'any', { value: originalAny, configurable: true, writable: true });
  }
});

test('artifact interruption aborts pending response headers without leaving a file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ae-artifact-cancel-'));
  try {
    await delayedGateway(500, async (host) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30);
      try {
        await assert.rejects(downloadAnalysisArtifact(host, 'run_test', 'artifact_test', join(directory, 'result.json'),
          { ensureReady: false, signal: controller.signal }), { code: 'ASYNC_WAIT_INTERRUPTED' });
        assert.deepEqual(await readdir(directory), []);
      } finally {
        clearTimeout(timer);
      }
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
