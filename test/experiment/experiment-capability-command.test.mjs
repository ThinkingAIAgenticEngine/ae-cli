import assert from 'node:assert/strict';
import { experimentGet } from '../../src/commands/te-experiment/experiment/get.ts';
import { experimentSave } from '../../src/commands/te-experiment/experiment/save.ts';
import { featureGet } from '../../src/commands/te-experiment/feature/get.ts';
import { metricSave } from '../../src/commands/te-experiment/metric/save.ts';
import { trafficLayerBatchDelete } from '../../src/commands/te-experiment/traffic-layer/batch-delete.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../../src/core/cli-token.ts';

const HOST = 'http://localhost';

clearCapabilityGatewayRoutesForTest();
registerCapabilityGatewayRoute('experiment', { gatewayDomain: 'engage' });

/** Converts a kebab-case flag name to the test option key. */
function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/** Creates the minimal runtime context used by command builders. */
function makeCtx(options) {
  return {
    str(name) { return String(options[camelCase(name)] ?? ''); },
    num(name) { return Number(options[camelCase(name)] ?? 0); },
    bool(name) { return Boolean(options[camelCase(name)]); },
    json(name) { return options[camelCase(name)]; },
    host() { return HOST; },
    mcpUrl() { return undefined; },
    service() { return 'experiment'; },
  };
}

/** Captures one Capability dry-run request. */
async function captureDryRun(command, options) {
  setCliTokenManual('cli-test-token', HOST);
  let request;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    request = { url: String(url), body: JSON.parse(String(init?.body)) };
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    await command.dryRun(makeCtx(options));
    return request;
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(HOST);
  }
}

const getRequest = await captureDryRun(experimentGet, { projectId: 1, expId: 'exp_1' });
assert.equal(getRequest.url,
  `${HOST}/api/cli/engage/v1/capabilities/experiment.experiment.get/dry-run`);
assert.deepEqual(getRequest.body, { input: { project_id: 1, exp_id: 'exp_1' } });

const saveRequest = await captureDryRun(experimentSave, {
  projectId: 1,
  req: {
    expName: 'Demo',
    targeting: {
      definitionRequest: {
        type: 'condition',
        conditions: { relation: 'and', items: [] },
      },
    },
  },
});
assert.deepEqual(saveRequest.body, {
  input: {
    project_id: 1,
    req: {
      expName: 'Demo',
      targeting: {
        definitionRequest: {
          type: 'condition',
          conditions: { relation: 'and', items: [] },
        },
      },
    },
  },
});

const metricSaveRequest = await captureDryRun(metricSave, {
  projectId: 1,
  req: {
    metricId: 'login_users',
    metricDefinition: {
      type: 'event',
      event: 'login',
      aggregation: 'user_count',
    },
  },
});
assert.deepEqual(metricSaveRequest.body, {
  input: {
    project_id: 1,
    req: {
      metricId: 'login_users',
      metricDefinition: {
        type: 'event',
        event: 'login',
        aggregation: 'user_count',
      },
    },
  },
});

const featureRequest = await captureDryRun(featureGet, {
  projectId: 1,
  featureKey: 'checkout_color',
  version: 'v2',
});
assert.deepEqual(featureRequest.body, {
  input: { project_id: 1, feature_key: 'checkout_color', version: 'v2' },
});

const deleteRequest = await captureDryRun(trafficLayerBatchDelete, {
  projectId: 1,
  layerIds: ['layer_1'],
});
assert.deepEqual(deleteRequest.body, {
  input: { project_id: 1, layer_ids: ['layer_1'] },
});

assert.equal(trafficLayerBatchDelete.risk, 'high-risk-write');
process.stdout.write('experiment capability command contract: OK\n');
