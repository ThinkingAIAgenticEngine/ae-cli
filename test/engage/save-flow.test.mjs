import assert from 'node:assert/strict';

const { registerMcpMapping } = await import('../../src/core/mcp.ts');
const { saveFlow } = await import('../../src/commands/te-engage/flow/save-flow.ts');

registerMcpMapping('engage_flow', { componentName: 'engage', mappingPath: 'flow' });

function ctxWithReq(req) {
  return {
    str() {
      return '';
    },
    num(name) {
      assert.equal(name, 'project_id');
      return 1;
    },
    optionalNum() {
      return undefined;
    },
    bool() {
      return false;
    },
    json(name) {
      assert.equal(name, 'req');
      return req;
    },
    host() {
      return 'https://example.test';
    },
    mcpUrl() {
      return undefined;
    },
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`  OK: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    throw err;
  }
}

console.log('engage save_flow tests');

test('validate rejects request without operation', () => {
  assert.throws(
    () => saveFlow.validate(ctxWithReq({ flowName: 'demo' })),
    /Flag --req\.operation must be one of: build, preview, commit/,
  );
});

test('validate rejects legacy nodeList and edgeList fields', () => {
  assert.throws(
    () => saveFlow.validate(ctxWithReq({
      operation: 'build',
      nodeList: [],
      edgeList: [],
    })),
    /Flag --req must use nodes\/edges instead of legacy nodeList\/edgeList/,
  );
});

test('validate rejects removed sourceFlowUuid clone mode', () => {
  assert.throws(
    () => saveFlow.validate(ctxWithReq({
      operation: 'build',
      sourceFlowUuid: 'flow_uuid_1',
    })),
    /Flag --req\.sourceFlowUuid is no longer supported; call \+flow_detail and build nodes\/edges instead/,
  );
});

test('validate accepts operation values handled by backend normalization', () => {
  assert.doesNotThrow(() => saveFlow.validate(ctxWithReq({ operation: ' Build ' })));
});

test('dry-run keeps operation-based request shape', () => {
  const dryRun = saveFlow.dryRun(ctxWithReq({
    operation: 'build',
    flowName: 'demo',
    nodes: [{ id: 'n1', type: 'exit_flow', config: {} }],
    edges: [],
  }));
  assert.equal(dryRun.body.toolName, 'save_flow');
  assert.equal(dryRun.body.arguments.req.projectId, 1);
  assert.equal(dryRun.body.arguments.req.operation, 'build');
  assert.equal(dryRun.body.arguments.req.nodes[0].id, 'n1');
});

console.log('All engage save_flow tests passed.');
