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

const abIndicator = (eventDefinition) => ({
  operation: 'build',
  nodes: [{
    id: 'ab',
    type: 'ab_split_flow',
    config: {
      indicatorsDef: [{
        indicatorsUuid: 'metric-1',
        name: 'Maximum payment amount',
        completionIndicatorType: 0,
        touch_cycle_num: 1,
        touch_cycle_num_unit: 'day',
        eventDefinition,
      }],
    },
  }],
});

await test('validate accepts complete semantic AB indicator comparisons', () => {
  assert.doesNotThrow(() => flowSave.validate(ctxWithReq(abIndicator({
    type: 'event',
    event: 'payment',
    aggregation: 'max',
    property: 'pay_amount',
    operator: 'gt',
    value: 0,
    filters: { relation: 'and', items: [{ field: 'gold', operator: 'gt', values: [20] }] },
  }))));
});

await test('validate rejects AB indicator without aggregate operator', () => {
  assert.throws(() => flowSave.validate(ctxWithReq(abIndicator({
    type: 'event', event: 'payment', aggregation: 'max', property: 'pay_amount', value: 0,
  }))), /eventDefinition\.operator must be one of/);
});

await test('validate rejects AB indicator property filter without operator', () => {
  assert.throws(() => flowSave.validate(ctxWithReq(abIndicator({
    type: 'event', event: 'payment', aggregation: 'max', property: 'pay_amount',
    operator: 'gt', value: 0,
    filters: { relation: 'and', items: [{ field: 'gold', values: [20] }] },
  }))), /filters\.items\[0\]\.operator must be one of/);
});

await test('validate rejects AB indicator comparison filter without values', () => {
  assert.throws(() => flowSave.validate(ctxWithReq(abIndicator({
    type: 'event', event: 'payment', aggregation: 'max', property: 'pay_amount',
    operator: 'gt', value: 0,
    filters: { relation: 'and', items: [{ field: 'gold', operator: 'gt' }] },
  }))), /filters\.items\[0\]\.values must be an array with at least 1 item/);
});

await test('validate rejects conflicting semantic and legacy AB indicator events', () => {
  const req = abIndicator({
    type: 'event', event: 'payment', aggregation: 'count', operator: 'gt', value: 0,
  });
  req.nodes[0].config.indicatorsDef[0].event = { eventName: 'payment' };
  assert.throws(() => flowSave.validate(ctxWithReq(req)), /cannot contain both event and eventDefinition/);
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
