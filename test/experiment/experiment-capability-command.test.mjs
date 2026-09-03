import assert from 'node:assert/strict';
import { experimentGet } from '../../src/commands/te-experiment/experiment/get.ts';
import { experimentSave } from '../../src/commands/te-experiment/experiment/save.ts';
import { experimentUpdateMetrics } from '../../src/commands/te-experiment/experiment/update-metrics.ts';
import { featureGet } from '../../src/commands/te-experiment/feature/get.ts';
import { featureWhitelistBatchDelete } from '../../src/commands/te-experiment/feature-whitelist/batch-delete.ts';
import { featureWhitelistList } from '../../src/commands/te-experiment/feature-whitelist/list.ts';
import { featureWhitelistSave } from '../../src/commands/te-experiment/feature-whitelist/save.ts';
import { featureWhitelistUpdateStatus } from '../../src/commands/te-experiment/feature-whitelist/update-status.ts';
import {
  metricSave,
  validateMetricSaveRequest,
} from '../../src/commands/te-experiment/metric/save.ts';
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
      aggregation: 'sum',
      property: 'amount',
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
        aggregation: 'sum',
        property: 'amount',
      },
    },
  },
});

assert.throws(
  () => validateMetricSaveRequest({
    metricId: 'payment_sum_with_invalid_filter',
    metricDefinition: {
      type: 'event', event: 'payment', aggregation: 'sum', property: 'gold',
      filters: { relation: 'and', items: [{ field: 'gold', values: [10] }] },
    },
  }),
  /filters\.items\[0\]\.operator is required/,
);

for (const aggregation of ['total_count', 'user_count', 'active_days']) {
  assert.doesNotThrow(() => validateMetricSaveRequest({
    metricId: `preset_${aggregation}`,
    metricDefinition: { type: 'event', event: 'login', aggregation },
  }));
}

assert.throws(() => validateMetricSaveRequest({
  metricId: 'unsupported_avg_per_user',
  metricDefinition: { type: 'event', event: 'login', aggregation: 'avg_per_user' },
}), /aggregation must be one of: total_count, user_count, active_days, sum, avg, max, distinct_count/);

const updateMetricsRequest = await captureDryRun(experimentUpdateMetrics, {
  projectId: 1,
  expId: 'exp_1',
  metrics: [
    { metricId: 'conversion', metricRole: 'primary' },
    { metricId: 'error_rate', metricRole: 'guardrail' },
  ],
});
assert.deepEqual(updateMetricsRequest.body, {
  input: {
    project_id: 1,
    req: {
      expId: 'exp_1',
      metrics: [
        { metricId: 'conversion', metricRole: 'primary' },
        { metricId: 'error_rate', metricRole: 'guardrail' },
      ],
    },
  },
});
assert.throws(() => experimentUpdateMetrics.validate(makeCtx({
  metrics: [{ metricId: 'watch_metric', metricRole: 'observation' }],
})), /metricRole must be one of primary, secondary, guardrail/);

const whitelistSavePreview = await captureDryRun(featureWhitelistSave, {
  projectId: 1,
  featureKey: 'checkout_color',
  status: 'enable',
  whitelist: [{ bucket_id: '#user_id', rules: [{ ids: ['u1'], value: 'red' }] }],
});

const whitelistListPreview = await captureDryRun(featureWhitelistList, {
  projectId: 1,
  featureKey: 'checkout_color',
});
assert.equal(whitelistListPreview.url,
  `${HOST}/api/cli/engage/v1/capabilities/experiment.feature_whitelist.list/dry-run`);
assert.deepEqual(whitelistListPreview.body.input,
  { project_id: 1, feature_key: 'checkout_color' });
assert.equal(whitelistSavePreview.url,
  `${HOST}/api/cli/engage/v1/capabilities/experiment.feature_whitelist.save/dry-run`);
assert.deepEqual(whitelistSavePreview.body, {
  input: {
    project_id: 1,
    feature_key: 'checkout_color',
    status: 'enable',
    whitelist: [{ bucket_id: '#user_id', rules: [{ ids: ['u1'], value: 'red' }] }],
  },
});

assert.doesNotThrow(() => featureWhitelistSave.validate(makeCtx({
  whitelist: [
    { bucket_id: '#user_id', rules: [{ ids: ['same-id'], value: 'red' }] },
    { bucket_id: '#account_id', rules: [{ ids: ['same-id'], value: 'blue' }] },
  ],
})));
assert.throws(() => featureWhitelistSave.validate(makeCtx({
  whitelist: [{
    bucket_id: '#user_id',
    rules: [
      { ids: ['duplicate-id'], value: 'red' },
      { ids: ['duplicate-id'], value: 'blue' },
    ],
  }],
})), /bucket #user_id contains duplicate ID: duplicate-id/);

const whitelistModifyPreview = await captureDryRun(featureWhitelistSave, {
  projectId: 1,
  featureKey: 'checkout_color',
  ruleId: '0001',
  whitelist: [{ bucket_id: '#user_id', rules: [{ ids: ['u2'], value: '' }] }],
});
assert.equal(whitelistModifyPreview.body.input.rule_id, '0001');

const whitelistStatusPreview = await captureDryRun(featureWhitelistUpdateStatus, {
  projectId: 1, ruleId: '0001', status: 'disable',
});
assert.deepEqual(whitelistStatusPreview.body.input,
  { project_id: 1, rule_id: '0001', status: 'disable' });

const whitelistDeletePreview = await captureDryRun(featureWhitelistBatchDelete, {
  projectId: 1, ruleIds: ['0001'],
});
assert.deepEqual(whitelistDeletePreview.body.input, { project_id: 1, rule_ids: ['0001'] });
assert.equal(featureWhitelistBatchDelete.risk, 'high-risk-write');

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
