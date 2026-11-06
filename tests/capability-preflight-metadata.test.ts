import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createCapabilityCommand } from '../src/core/capability-command.ts';
import { registerCapabilityGatewayRoute } from '../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { projectSemanticAssetPackageExport } from '../src/commands/project-semantic/asset-package/export.ts';
import { createRuntimeContext } from '../src/framework/runner.ts';
import { formatOutput } from '../src/framework/output.ts';
import { traceCount } from '../src/commands/ai-monitor/trace/count.ts';

const host = 'https://contract-metadata.example.invalid';
const originalFetch = globalThis.fetch;
const meta = { invocation_id: 'inv_test', request_id: 'request_test', warnings: ['test warning'] };
registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
});

for (const action of ['validateInput', 'dryRun'] as const) {
  test(`curated ${action} retains successful gateway metadata`, async () => {
    setCliTokenManual('synthetic-test-token', host);
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, data: { valid: true }, meta }));
    const command = createCapabilityCommand({
      cliService: 'analysis', resource: 'test', command: 'get', capabilityId: 'analysis.test.get',
      description: 'Test metadata preservation.', flags: [], risk: 'read', buildInput: () => ({ project_id: 1 }),
    });
    const ctx = createRuntimeContext(command, {}, { host, format: 'json' });
    const output = JSON.parse(await formatOutput(await command[action]!(ctx), 'json'));
    assert.deepEqual(output, { ok: true, data: { valid: true }, meta });
  });
}

for (const action of ['validateInput', 'dryRun', 'execute'] as const) {
  test(`project asset package ${action} retains successful gateway metadata`, async () => {
    setCliTokenManual('synthetic-test-token', host);
    const data = { run_id: 'run_test', artifact_id: 'artifact_test' };
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, data, meta }));
    const ctx = createRuntimeContext(projectSemanticAssetPackageExport, { projectId: 1 }, { host, format: 'json' });
    const output = JSON.parse(await formatOutput(await projectSemanticAssetPackageExport[action]!(ctx), 'json'));
    assert.deepEqual(output, { ok: true, data, meta });
  });
}

for (const action of ['validateInput', 'dryRun'] as const) {
  test(`AI Monitor ${action} resolves scope and retains gateway metadata`, async () => {
    setCliTokenManual('synthetic-test-token', host);
    const requests: Array<{ path: string; input: Record<string, unknown> }> = [];
    globalThis.fetch = async (url, options) => {
      const path = new URL(String(url)).pathname;
      const input = JSON.parse(String(options?.body)).input;
      requests.push({ path, input });
      if (path.endsWith('/ai_monitor.platform.list/execute')) {
        return Response.json({ ok: true, data: { items: [{
          platform_id: 'resolved-agent', platform_name: 'Agent',
          environments: [{ environment_id: 'demo', environment_name: 'Sandbox' }],
        }] }, meta: { request_id: 'discovery-only' } });
      }
      return Response.json({ ok: true, data: { valid: true }, meta });
    };
    const ctx = createRuntimeContext(traceCount, { lastDays: 7 }, { host, format: 'json' });
    await traceCount.preflight!(ctx);
    assert.equal(requests.length, 0, 'local preflight must not discover or dispatch');
    const output = JSON.parse(await formatOutput(await traceCount[action]!(ctx), 'json'));
    assert.equal(requests.length, 2);
    assert.equal(requests[0].path, '/ai-monitor/api/cli/v1/capabilities/ai_monitor.platform.list/execute');
    const suffix = action === 'validateInput' ? 'validate' : 'dry-run';
    assert.equal(requests[1].path, `/ai-monitor/api/cli/v1/capabilities/ai_monitor.trace.count/${suffix}`);
    assert.deepEqual(requests[1].input, { data_token: 'resolved-agent', report_source: 'demo', last_days: 7 });
    assert.deepEqual(output, { ok: true, data: { valid: true }, meta });
  });
}
