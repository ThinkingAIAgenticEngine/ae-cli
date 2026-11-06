import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { inputFileInspect } from '../src/commands/te-analysis/input-file/inspect.ts';
import userCommands from '../src/commands/te-analysis/user/index.ts';
import { createRuntimeContext } from '../src/framework/runner.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';

const host = 'https://input-file-route.example.invalid';
const originalDomain = process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
const originalFetch = globalThis.fetch;
afterEach(() => {
  if (originalDomain === undefined) delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
  else process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN = originalDomain;
  globalThis.fetch = originalFetch;
  clearCliToken(host);
});

for (const domain of ['', 'analysis', 'custom']) {
  test(`input-file preview and inspect hint honor gateway domain ${JSON.stringify(domain)}`, async () => {
    process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN = domain;
    setCliTokenManual('synthetic-test-token', host);
    let actualUrl = '';
    globalThis.fetch = async (url) => {
      actualUrl = String(url);
      return new Response(JSON.stringify({ ok: true, data: { input_file_id: 'ifile_test' } }));
    };
    const ctx = createRuntimeContext(inputFileInspect, { inputFileId: 'ifile_test' }, { host, format: 'json' });
    const preview = await inputFileInspect.dryRun!(ctx);
    const result = await inputFileInspect.execute(ctx);
    const prefix = domain ? `/api/cli/${domain}/v1` : '/api/cli/v1';
    assert.equal(preview.url, `${host}${prefix}/input-files/ifile_test`);
    assert.equal(preview.url, actualUrl);
    assert.equal(result.inspect_path, `${prefix}/input-files/ifile_test`);
  });
}

test('local ID import preview uses the same root gateway for both steps', async () => {
  process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN = '';
  const command = userCommands.find((entry) => entry.capabilityId === 'analysis.user_cluster.create_id');
  assert.ok(command);
  const ctx = createRuntimeContext(command, { projectId: 1, inputFile: '/test/input.csv' }, { host, format: 'json' });
  const preview = await command.dryRun!(ctx);
  assert.equal(preview.steps[0].url, `${host}/api/cli/v1/input-files`);
  assert.equal(preview.steps[1].url, `${host}/api/cli/v1/capabilities/analysis.user_cluster.create_id/dry-run`);
});
