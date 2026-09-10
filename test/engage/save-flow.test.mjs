import assert from 'node:assert/strict';

const { flowSave } = await import('../../src/commands/te-engage/engage-flow/flow/save.ts');
const { clearCliToken, setCliTokenManual } = await import('../../src/core/cli-token.ts');

const HOST = 'https://example.test';

function ctxWithReq(req) {
  return {
    str() { return ''; },
    num(name) {
      assert.equal(name, 'project-id');
      return 1;
    },
    optionalNum() { return undefined; },
    bool() { return false; },
    json(name) {
      assert.equal(name, 'req');
      return req;
    },
    host() { return HOST; },
    mcpUrl() { return undefined; },
  };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  OK: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    throw err;
  }
}

console.log('engage flow save capability tests');

await test('validate rejects request without operation', () => {
  assert.throws(
    () => flowSave.validate(ctxWithReq({ flowName: 'demo' })),
    /Flag --req\.operation must be one of: build, preview, commit/,
  );
});

await test('validate rejects legacy nodeList and edgeList fields', () => {
  assert.throws(
    () => flowSave.validate(ctxWithReq({ operation: 'build', nodeList: [], edgeList: [] })),
    /Flag --req must use nodes\/edges instead of legacy nodeList\/edgeList/,
  );
});

await test('validate rejects removed sourceFlowUuid clone mode', () => {
  assert.throws(
    () => flowSave.validate(ctxWithReq({ operation: 'build', sourceFlowUuid: 'flow_uuid_1' })),
    /Flag --req\.sourceFlowUuid is unsupported/,
  );
});

await test('validate accepts operation values handled by backend normalization', () => {
  assert.doesNotThrow(() => flowSave.validate(ctxWithReq({ operation: ' Build ' })));
});

await test('dry-run uses the capability endpoint and stable input shape', async () => {
  setCliTokenManual('cli-test-token', HOST);
  const previousFetch = globalThis.fetch;
  let capturedUrl;
  let capturedBody;
  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    await flowSave.dryRun(ctxWithReq({ operation: 'build', flowName: 'demo' }));
    assert.equal(capturedUrl, `${HOST}/api/cli/engage/v1/capabilities/engage-flow.flow.save/dry-run`);
    assert.deepEqual(capturedBody, {
      input: { project_id: 1, req: { operation: 'build', flowName: 'demo' } },
    });
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(HOST);
  }
});

console.log('All engage flow save capability tests passed.');
