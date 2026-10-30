import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { experimentGet } from '../../src/commands/te-experiment/experiment/get.ts';
import { experimentSave } from '../../src/commands/te-experiment/experiment/save.ts';
import { experimentManage } from '../../src/commands/te-experiment/experiment/manage.ts';
import { experimentUpdateMetrics } from '../../src/commands/te-experiment/experiment/update-metrics.ts';
import { externalExperimentSaveSubmit } from '../../src/commands/te-experiment/external-experiment/save-submit.ts';
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

const HOST = 'http://localhost';
const configDir = mkdtempSync(join(tmpdir(), 'ae-experiment-test-'));
const previousConfigDir = process.env.TE_AGENT_CLI_CONFIG_DIR;
writeFileSync(join(configDir, 'cli-token.json'), JSON.stringify({ url: HOST, token: 'cli_test_token' }));
process.env.TE_AGENT_CLI_CONFIG_DIR = configDir;
process.once('exit', () => {
  rmSync(configDir, { recursive: true, force: true });
  if (previousConfigDir === undefined) delete process.env.TE_AGENT_CLI_CONFIG_DIR;
  else process.env.TE_AGENT_CLI_CONFIG_DIR = previousConfigDir;
});

clearCapabilityGatewayRoutesForTest();
registerCapabilityGatewayRoute('experiment', { gatewayDomain: 'engage' });

/** Converts a kebab-case flag name to the test option key. */
function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/** Creates the minimal runtime context used by command builders. */
function makeCtx(options) {
  return {
    has(name) { return Object.hasOwn(options, camelCase(name)); },
    str(name) { return String(options[camelCase(name)] ?? ''); },
    num(name) { return Number(options[camelCase(name)] ?? 0); },
    bool(name) { return Boolean(options[camelCase(name)]); },
    json(name) { return options[camelCase(name)]; },
    host() { return HOST; },
    mcpUrl() { return undefined; },
    service() { return 'experiment'; },
  };
}

/** Captures a Capability request and its returned payload. */
async function captureDryRun(command, options, operation = 'dryRun', data = { dry_run: true }) {
  let request;
  let requestCount = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    requestCount += 1;
    // Agent context is framework metadata and depends on the invoking environment.
    const { client_context: _clientContext, ...body } = JSON.parse(String(init?.body));
    request = { url: String(url), body, headers: init?.headers };
    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    command.validate?.(makeCtx(options));
    const result = await command[operation](makeCtx(options));
    return { ...request, result, requestCount };
  } finally {
    globalThis.fetch = previousFetch;
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

const scheduledReq = Object.freeze({
  expId: 'exp_1',
  startTime: '2026-11-01T15:00:00+08:00',
  expCycle: Object.freeze({ cycleType: 'day', dayNum: 7 }),
});
const timingOptions = {
  projectId: 1,
  req: scheduledReq,
  startTime: '2026-11-01T16:00:01.123+08:00',
  fixedEndTime: '2026-11-08T16:30:00+08:00',
};
const expectedTimingInput = {
  project_id: 1,
  req: {
    expId: 'exp_1',
    startTime: timingOptions.startTime,
    expCycle: { cycleType: 'time', dayNum: 7, fixedEndTime: timingOptions.fixedEndTime },
  },
};
for (const [operation, endpoint] of [['validateInput', 'validate'], ['dryRun', 'dry-run'], ['execute', 'execute']]) {
  const request = await captureDryRun(experimentSave, timingOptions, operation);
  assert.equal(request.url,
    `${HOST}/api/cli/engage/v1/capabilities/experiment.experiment.save/${endpoint}`);
  assert.deepEqual(request.body, { input: expectedTimingInput });
  assert.equal(request.requestCount, 1, 'saving timing must not submit or start the experiment');
  assert.equal(request.headers['cli-token'], 'cli_test_token');
}
assert.equal(scheduledReq.startTime, '2026-11-01T15:00:00+08:00');
assert.deepEqual(scheduledReq.expCycle, { cycleType: 'day', dayNum: 7 });

// Existing native requests retain their exact timing and omission semantics.
for (const req of [
  { expName: 'Untimed draft' },
  { expId: 'exp_1', startTime: null },
  { expId: 'exp_1', allocation: 20 },
  { expId: 'exp_1', startTime: '2026-11-01T16:00:00+08:00', expCycle: { cycleType: 'day', dayNum: 7 } },
  { expId: 'exp_1', expCycle: { cycleType: 'sample', sampleNum: 1000 } },
  { expId: 'exp_1', expCycle: { cycleType: 'time', fixedEndTime: timingOptions.fixedEndTime } },
]) {
  const request = await captureDryRun(experimentSave, { projectId: 1, req });
  assert.deepEqual(request.body, { input: { project_id: 1, req } });
}

const startOnlyRequest = await captureDryRun(experimentSave, {
  projectId: 1, req: { expName: 'Scheduled draft' }, startTime: '2026-11-01T08:00:00Z',
});
assert.deepEqual(startOnlyRequest.body.input.req,
  { expName: 'Scheduled draft', startTime: '2026-11-01T08:00:00Z' });
const endOnlyRequest = await captureDryRun(experimentSave, {
  projectId: 1, req: { expId: 'exp_1' }, fixedEndTime: timingOptions.fixedEndTime,
});
assert.deepEqual(endOnlyRequest.body.input.req,
  { expId: 'exp_1', expCycle: { cycleType: 'time', fixedEndTime: timingOptions.fixedEndTime } });

for (const name of ['startTime', 'fixedEndTime']) {
  for (const value of ['', 'tomorrow', '2026-11-01T16:00:00', '2026-13-01T16:00:00+08:00']) {
    assert.throws(() => experimentSave.validate(makeCtx({
      req: { expId: 'exp_1' }, [name]: value,
    })), /ISO-8601 timestamp with a timezone offset/);
  }
}
assert.throws(() => experimentSave.validate(makeCtx({
  req: { expType: 'external' }, startTime: timingOptions.startTime,
})), /only support Feature experiments/);
for (const expCycle of [[], 'day', 7]) {
  assert.throws(() => experimentSave.validate(makeCtx({
    req: { expId: 'exp_1', expCycle }, fixedEndTime: timingOptions.fixedEndTime,
  })), /req.expCycle must be a JSON object/);
}

const submitRequest = await captureDryRun(experimentManage, {
  projectId: 1, expId: 'exp_1', targetStatus: 'pending',
}, 'execute', { result: true });
assert.equal(submitRequest.url,
  `${HOST}/api/cli/engage/v1/capabilities/experiment.experiment.manage/execute`);
assert.deepEqual(submitRequest.body.input,
  { project_id: 1, exp_id: 'exp_1', target_status: 'pending' });
assert.deepEqual(JSON.parse(JSON.stringify(submitRequest.result)), { result: true });
assert.equal(submitRequest.requestCount, 1);
const scheduleDetail = { item: {
  exp_id: 'exp_1', status: 'pending', start_time: timingOptions.startTime,
  exp_cycle: { cycle_type: 'time', fixed_end_time: timingOptions.fixedEndTime },
  scheduled_start_error: 'The configured experiment window has expired.',
  start_time_adjustment_required: true,
} };
const detailRequest = await captureDryRun(experimentGet,
  { projectId: 1, expId: 'exp_1' }, 'execute', scheduleDetail);
assert.deepEqual(JSON.parse(JSON.stringify(detailRequest.result)), scheduleDetail);

const manualStartRequest = await captureDryRun(experimentManage, {
  projectId: 1, expId: 'exp_1', targetStatus: 'running', remark: 'Start now',
});
assert.deepEqual(manualStartRequest.body.input,
  { project_id: 1, exp_id: 'exp_1', target_status: 'running', remark: 'Start now' });

// Exercise flag registration, JSON stdout, and validation through the real CLI entry.
const gatewayHook = 'data:text/javascript,' + encodeURIComponent(`
  globalThis.fetch = async (url, init) => new Response(JSON.stringify({
    ok: true, data: { url: String(url), input: JSON.parse(init.body).input }
  }), { headers: { 'Content-Type': 'application/json' } });
`);
function runSaveCli(startTime) {
  return spawnSync(process.execPath, [
    '--import', 'tsx', '--import', gatewayHook, 'src/index.ts', '--no-update-check',
    'experiment', 'experiment', 'save', '--project-id', '1', '--req', JSON.stringify(scheduledReq),
    '--start-time', startTime, '--fixed-end-time', timingOptions.fixedEndTime, '--dry-run',
  ], { encoding: 'utf8' });
}
const cliPreview = runSaveCli(timingOptions.startTime);
assert.equal(cliPreview.status, 0, cliPreview.stderr);
const cliPreviewOutput = JSON.parse(cliPreview.stdout);
assert.equal(cliPreviewOutput.ok, true);
assert.equal(cliPreviewOutput.data.url,
  `${HOST}/api/cli/engage/v1/capabilities/experiment.experiment.save/dry-run`);
assert.deepEqual(cliPreviewOutput.data.input, expectedTimingInput);
const cliInvalidTime = runSaveCli('2026-11-01T16:00:00');
assert.equal(cliInvalidTime.status, 1, cliInvalidTime.stderr);
assert.equal(cliInvalidTime.stdout, '');
const cliInvalidOutput = JSON.parse(cliInvalidTime.stderr);
assert.equal(cliInvalidOutput.ok, false);
assert.equal(cliInvalidOutput.error.type, 'validation');
assert.match(cliInvalidOutput.error.message, /--start-time.*timezone offset/);

// Preserve actionable Gateway errors for native --req calls on both HTTP error paths.
const timingFailures = [
  {
    req: { expId: 'draft_1', startTime: timingOptions.startTime,
      expCycle: { cycleType: 'time', fixedEndTime: timingOptions.startTime } },
    error: {
      type: 'validation', code: 'EXPERIMENT_END_TIME_INVALID',
      message: 'Experiment deadline must be later than its start time.',
      hint: 'Set req.expCycle.fixedEndTime after req.startTime.',
      details: { field: 'req.expCycle.fixedEndTime', related_fields: ['req.startTime'] },
    },
  },
  {
    req: { expId: 'draft_1', expCycle: { cycleType: 'time' } },
    error: {
      type: 'validation', code: 'EXPERIMENT_END_TIME_REQUIRED',
      message: 'req.expCycle.fixedEndTime is required when req.expCycle.cycleType=time.',
      hint: 'Provide req.expCycle.fixedEndTime as an ISO-8601 timestamp with an explicit timezone offset.',
      details: { field: 'req.expCycle.fixedEndTime' },
    },
  },
];
const legacyFailure = {
  req: { expId: 'draft_1', allocation: 10 },
  error: { type: 'api', code: 'CAPABILITY_EXECUTION_FAILED',
    message: 'Capability execution failed. Use invocation_id for troubleshooting.' },
};
for (const [failure, status] of [
  ...timingFailures.flatMap((failure) => [200, 400].map((status) => [failure, status])),
  [legacyFailure, 500],
]) {
  const meta = { capability_id: 'experiment.experiment.save', invocation_id: 'timing-validation-test' };
  const envelope = { ok: false, error: failure.error, meta };
  const hook = 'data:text/javascript,' + encodeURIComponent(`
    globalThis.fetch = async () => new Response(${JSON.stringify(JSON.stringify(envelope))},
      { status: ${status}, headers: { 'Content-Type': 'application/json' } });
  `);
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', '--import', hook, 'src/index.ts', '--no-update-check',
    'experiment', 'experiment', 'save', '--project-id', '1', '--req', JSON.stringify(failure.req),
  ], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), envelope);
}

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

const externalExperimentRequest = await captureDryRun(externalExperimentSaveSubmit, {
  projectId: 1,
  expName: 'Partner onboarding test',
  bucketId: '#user_id',
  startTime: '2026-09-01T00:00:00+08:00',
  endTime: '2026-09-15T00:00:00+08:00',
  supposition: 'The new onboarding improves activation.',
  groups: [
    { expGroupName: 'control', isControl: 1 },
    { expGroupName: 'variant', isControl: 0 },
  ],
  metrics: [{ metricId: 'activation_rate', metricRole: 'primary' }],
});
assert.equal(externalExperimentRequest.url,
  `${HOST}/api/cli/engage/v1/capabilities/experiment.experiment.save-submit/dry-run`);
assert.deepEqual(externalExperimentRequest.body, {
  input: {
    project_id: 1,
    req: {
      expType: 'external',
      expName: 'Partner onboarding test',
      bucketId: '#user_id',
      startTime: '2026-09-01T00:00:00+08:00',
      endTime: '2026-09-15T00:00:00+08:00',
      expSupposition: 'The new onboarding improves activation.',
      groups: [
        { expGroupName: 'control', isControl: 1 },
        { expGroupName: 'variant', isControl: 0 },
      ],
      metrics: [{ metricId: 'activation_rate', metricRole: 'primary' }],
    },
  },
});
assert.throws(() => externalExperimentSaveSubmit.validate(makeCtx({
  groups: [{ expGroupName: 'control', isControl: 1 }, { expGroupName: 'variant', isControl: 1 }],
  metrics: [{ metricId: 'activation_rate', metricRole: 'primary' }],
})), /exactly one group with isControl=1/);
assert.throws(() => externalExperimentSaveSubmit.validate(makeCtx({
  groups: [{ expGroupName: 'control', isControl: 1 }, { expGroupName: 'variant', isControl: 0 }],
  metrics: [{ metricId: 'activation_rate', metricRole: 'secondary' }],
})), /at least one primary metric binding/);
assert.throws(() => externalExperimentSaveSubmit.validate(makeCtx({
  expId: 'ext_1',
  groups: [{ expGroupName: 'control', isControl: 1 }, { expGroupName: 'variant', isControl: 0 }],
  metrics: [{ metricId: 'activation_rate', metricRole: 'primary' }],
})), /expGroupId is required when --exp-id is provided/);

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
