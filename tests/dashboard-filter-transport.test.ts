import assert from 'node:assert/strict';
import * as api from '../src/core/capability-api.js';
import { Command } from 'commander';
import { registerCapability } from '../src/commands/capability/index.js';
import { registerCommands } from '../src/framework/register.js';
import { dashboardUpdate } from '../src/commands/te-analysis/dashboard/update.js';
import { registerCapabilityGatewayRoute } from '../src/core/capability-routing.js';

const id = 'analysis.dashboard.update';
const leaf = { filter_type: 'SIMPLE', column_name: 'app', table_type: '1', select_type: 'string', calcu_symbol: 'C00', ftv: ['X'] };
const input = (items: unknown[]) => ({ project_id: 129, operation: 'default-filter', dashboard_id: 1, filter_name: 'test', filter: { junction_kind: 'and', ta_filters: items } });
const originalFetch = globalThis.fetch;

// Successful filter requests preserve their wire input in every transport wrapper.
const { mintCliToken, clearCliTokenCache } = await import('../src/core/cli-token.js');
const host = 'https://dashboard-filter.test';
const sent: unknown[] = [];
globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
  if (String(url).endsWith('/token/generate')) {
    return new Response(JSON.stringify({ return_code: 0, data: { userSecret: 'test-token' } }));
  }
  if (String(url).endsWith('/token/renew')) return new Response('', { status: 404 });
  sent.push(JSON.parse(String(init?.body)).input);
  return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
}) as typeof fetch;
try {
  await mintCliToken(host, 'test-access-token');
  for (const call of [api.executeCapability, api.executeCapabilityWithEnvelope, api.validateCapability,
    api.validateCapabilityWithEnvelope, api.dryRunCapability, api.dryRunCapabilityWithEnvelope]) {
    for (const operation of ['default-filter', 'personal-default-filter', 'business-filter']) {
      for (const condition of [leaf, { ...leaf, table_type: 'user', future_field: true }]) {
        const value = { ...input([condition, { ...leaf, column_name: 'channel', ftv: ['Y'] }]), operation };
        await call(host, 'analysis', id, value);
        assert.deepEqual(sent.at(-1), value);
      }
    }
  }
  assert.equal(sent.length, 36);

  // Exercise the actual command registration, argument parsing, runner and transport.
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  for (const operation of ['default-filter', 'personal-default-filter', 'business-filter']) {
    for (const mode of ['execute', 'validate', 'dry-run']) {
      const value = { ...input([{ ...leaf, table_type: 'user', future_field: true }]), operation };
      const paths = [
        ['capability', mode === 'execute' ? 'run' : mode, id, '--input', JSON.stringify(value)],
        ['analysis', 'dashboard', 'update', '--project-id', '129', '--dashboard-id', '1',
          '--operation', operation, '--filter-name', 'test', '--filter', JSON.stringify(value.filter),
          ...(mode === 'execute' ? [] : [`--${mode}`])],
        ...(mode === 'execute' ? [] : [
          ['capability', 'run', id, '--input', JSON.stringify(value), `--${mode}`],
        ]),
      ];
      for (const args of paths) {
        const requests: string[] = [];
        globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
          const path = new URL(String(url)).pathname;
          if (path.endsWith('/token/renew')) return new Response('', { status: 404 });
          requests.push(path);
          if (path.endsWith(`/capabilities/${id}`)) {
            return new Response(JSON.stringify({ ok: true, data: { risk: 'write' } }));
          }
          assert.equal(path, `/api/cli/analysis/v1/capabilities/${id}/${mode}`);
          assert.equal(init?.method, 'POST');
          assert.deepEqual(JSON.parse(String(init?.body)), { input: value });
          return new Response(JSON.stringify({ ok: true, data: { accepted: true } }));
        }) as typeof fetch;
        const success = await invoke(args);
        assert.equal(success.exitCode, 0);
        assert.equal(success.stderr, '');
        assert.deepEqual(JSON.parse(success.stdout), { ok: true, data: { accepted: true } });
        assert.deepEqual(requests, [
          ...(args[0] === 'capability' && mode === 'execute'
            ? [`/api/cli/analysis/v1/capabilities/${id}`] : []),
          `/api/cli/analysis/v1/capabilities/${id}/${mode}`,
        ]);

        // Common owns QP validation. Keep its complete error on both HTTP and envelope failures.
        for (const status of [200, 400]) {
          for (const type of ['validation', 'api', 'unknown']) {
            const error = { type, code: 'TEST_SERVER_ERROR', message: 'Rejected input', hint: 'Correct the field' };
            const meta = { invocation_id: 'validation-review', location: { field: 'filter.ta_filters[0].table_type' } };
            let dispatched = 0;
            globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
              const path = new URL(String(url)).pathname;
              if (path.endsWith('/token/renew')) return new Response('', { status: 404 });
              if (path.endsWith(`/capabilities/${id}`)) {
                return new Response(JSON.stringify({ ok: true, data: { risk: 'write' } }));
              }
              assert.equal(path, `/api/cli/analysis/v1/capabilities/${id}/${mode}`);
              assert.deepEqual(JSON.parse(String(init?.body)), { input: value });
              dispatched++;
              return new Response(JSON.stringify({ ok: false, error, meta }), { status });
            }) as typeof fetch;
            const failure = await invoke(args);
            assert.equal(dispatched, 1, 'The server must receive the filter exactly once');
            assert.equal(failure.exitCode, 1);
            assert.equal(failure.stdout, '');
            assert.deepEqual(JSON.parse(failure.stderr), {
              ok: false, error: { ...error, type: type === 'validation' ? 'validation' : 'api' }, meta,
            });
          }
        }
      }
    }
  }

} finally {
  globalThis.fetch = originalFetch;
  clearCliTokenCache(host);
}

console.log('Dashboard filter transport: inputs forwarded unchanged; server validation errors preserved.');

/** Capture both CLI error conventions without terminating the test process. */
async function invoke(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const originalOut = process.stdout.write;
  const originalErr = process.stderr.write;
  const originalExit = process.exit;
  const originalCode = process.exitCode;
  const exitSignal = new Error('Expected CLI exit');
  let stdout = '';
  let stderr = '';
  process.stdout.write = ((chunk: unknown) => { stdout += String(chunk); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown) => { stderr += String(chunk); return true; }) as typeof process.stderr.write;
  process.exitCode = 0;
  process.exit = ((code?: number) => { process.exitCode = code ?? 0; throw exitSignal; }) as typeof process.exit;
  try {
    const program = new Command()
      .option('--host <url>').option('--validate').option('--dry-run').option('--yes');
    registerCapability(program);
    registerCommands(program, [dashboardUpdate]);
    try {
      await program.parseAsync(['node', 'test', '--host', host, ...args]);
    } catch (error) {
      if (error !== exitSignal) throw error;
    }
    return { stdout, stderr, exitCode: Number(process.exitCode ?? 0) };
  } finally {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
    process.exit = originalExit;
    process.exitCode = originalCode;
  }
}
