import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { convertLocalData } from '../src/commands/data-integration/conversion.js';
import { validateMetricSaveRequest } from '../src/commands/te-experiment/metric/save.js';
import { validateMapping } from '../src/commands/data-integration/mapping.js';

const generator = fileURLToPath(new URL('../skills/ae-onboarding/scripts/generate.mjs', import.meta.url));
const requestBuilder = fileURLToPath(new URL('../skills/ae-onboarding/scripts/experiment-requests.mjs', import.meta.url));
const end = new Date();
const start = new Date(end.getTime() - 120_000);
const timezone = ['UTC', 'Pacific/Honolulu'].find((zone) => {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, dateStyle: 'short' });
  return formatter.format(start) === formatter.format(end);
})!;
const starIslandCohort = [...Array.from({ length: 18 }, (_, index) => index + 1), ...Array.from({ length: 10 }, (_, index) => index + 131)]
  .map((index) => `star-island-user-${index}`);

function replay(cohortFile: string, outputDir: string, options: Record<string, string> = {}, clock?: Date) {
  const args = {
    phase: 'plg-experiment-today', 'cohort-file': cohortFile, 'sample-id': 'star-island', 'item-id': 'starlight-bundle',
    'run-id': 'plg-test', 'experiment-id': 'experiment', 'control-id': 'original', 'treatment-id': 'coupon',
    start: start.toISOString(), end: end.toISOString(), timezone, 'output-dir': outputDir, ...options,
  };
  const clockArgs = clock ? ['--import', `data:text/javascript,Date.now%3D()%3D%3E${clock.getTime()}`] : [];
  return spawnSync(process.execPath, [...clockArgs, generator, ...Object.entries(args).map(([key, value]) => `--${key}=${value}`)], {
    encoding: 'utf8',
  });
}

function json(file: string) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function rows(file: string) {
  return readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
}

test('PLG request builder emits three saves with the exact cohort and linked metrics', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ae-plg-requests-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'input.json');
  const input = {
    industry: 'game', experimentType: 'item-coupon',
    sampleId: 'season-pass', itemId: 'season-pass-item', runId: 'plg-test',
    bucketId: '#account_id', accountIds: ['user-b', 'user-a'], metricIds: { secondary: 'verified_revenue' },
  };
  writeFileSync(file, JSON.stringify(input));
  const result = spawnSync(process.execPath, [requestBuilder, file], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const requests = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(requests), ['feature', 'metric', 'experiment']);
  const { feature, metric, experiment } = requests;
  validateMetricSaveRequest(metric);
  assert.equal(metric.format, 'integer');
  assert.deepEqual(metric.metricDefinition.filters.items, [
    { field: 'plg_sample_id', operator: 'eq', values: ['season-pass'] },
    { field: 'item_id', operator: 'eq', values: ['season-pass-item'] },
  ]);
  assert.deepEqual(experiment.featureKeyList, [feature.featureKey]);
  assert.deepEqual(experiment.expCycle, { cycleType: 'day', dayNum: 7 });
  assert.equal(experiment.startTime, undefined);
  assert.deepEqual(experiment.groups.map((group: { expGroupValue: string }) => JSON.parse(group.expGroupValue)),
    [['full_price'], ['coupon_20']]);
  assert.deepEqual(experiment.metrics, [
    { metricId: metric.metricId, metricRole: 'primary' },
    { metricId: 'verified_revenue', metricRole: 'secondary' },
  ]);
  assert.deepEqual(experiment.targeting.definitionRequest.conditions, {
    relation: 'or',
    items: ['user-a', 'user-b'].map((id) => ({ type: 'user', field: '#account_id', operator: 'eq', values: [id] })),
  });
  writeFileSync(file, JSON.stringify({ ...input, metricIds: { primary: 'verified_buyers' } }));
  const missingMetric = spawnSync(process.execPath, [requestBuilder, file], { encoding: 'utf8' });
  assert.equal(missingMetric.status, 1);
  assert.match(missingMetric.stderr, /verified net revenue metric ID/);
  assert.equal(missingMetric.stdout, '');
  writeFileSync(file, JSON.stringify({ ...input, itemId: 'starlight-bundle' }));
  const mismatch = spawnSync(process.execPath, [requestBuilder, file], { encoding: 'utf8' });
  assert.equal(mismatch.status, 1);
  assert.equal(mismatch.stdout, '');
  writeFileSync(file, JSON.stringify({ ...input, experimentType: 'unsupported' }));
  const unsupported = spawnSync(process.execPath, [requestBuilder, file], { encoding: 'utf8' });
  assert.equal(unsupported.status, 1);
  assert.match(unsupported.stderr, /Unsupported experiment type/);
  assert.equal(unsupported.stdout, '');
});

test('PLG request builder includes fixed audience and revenue requests for each Demo sample', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ae-plg-preset-requests-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const inputFile = join(dir, 'input.json');
  const seasonPassCohort = [...Array.from({ length: 12 }, (_, index) => index + 1), ...Array.from({ length: 20 }, (_, index) => index + 101)]
    .map((index) => `season-pass-user-${index}`);
  const samples = [
    { sampleId: 'star-island', itemId: 'starlight-bundle', accountIds: starIslandCohort, revenueId: 'plg_net_revenue_star_island' },
    { sampleId: 'season-pass', itemId: 'season-pass-item', accountIds: seasonPassCohort, revenueId: 'plg_net_revenue_season_pass' },
  ];
  for (const { sampleId, itemId, accountIds, revenueId } of samples) {
    writeFileSync(inputFile, JSON.stringify({ sampleId, itemId, runId: 'plg-test' }));
    const result = spawnSync(process.execPath, [requestBuilder, inputFile], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const { experiment, revenueMetric } = JSON.parse(result.stdout);
    validateMetricSaveRequest(revenueMetric);
    assert.equal(revenueMetric.metricId, revenueId);
    assert.equal(revenueMetric.metricPurpose, 'confidence_statistics');
    assert.equal(revenueMetric.format, 'float2');
    assert.deepEqual(revenueMetric.metricDefinition, {
      type: 'event', event: 'payment_success', aggregation: 'sum', property: 'amount',
      filters: {
        relation: 'and',
        items: [
          { field: 'plg_sample_id', operator: 'eq', values: [sampleId] },
          { field: 'item_id', operator: 'eq', values: [itemId] },
        ],
      },
    });
    assert.deepEqual(experiment.metrics[1], { metricId: revenueId, metricRole: 'secondary' });
    assert.equal(experiment.bucketId, '#account_id');
    assert.deepEqual(experiment.targeting.definitionRequest.conditions, {
      relation: 'or',
      items: [...accountIds].sort().map((id) => ({ type: 'user', field: '#account_id', operator: 'eq', values: [id] })),
    });
  }
});

test('PLG replay keeps the selected cohort fixed and converts exposure and outcome data without losing identifiers', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ae-plg-replay-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cohort = join(dir, 'cohort.json');
  const first = join(dir, 'first');
  const retry = join(dir, 'retry');
  writeFileSync(cohort, JSON.stringify(starIslandCohort));
  const shortStart = new Date(end.getTime() - 5_000);
  const options = { start: shortStart.toISOString() };
  const result = replay(cohort, first, options, end);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).files, { replay: 40 });

  writeFileSync(cohort, JSON.stringify([...starIslandCohort].reverse()));
  const retryResult = replay(cohort, retry, { ...options, industry: 'game', 'experiment-type': 'item-coupon' }, end);
  assert.equal(retryResult.status, 0, retryResult.stderr);
  for (const file of ['replay.jsonl', 'replay.mapping.json', 'plg-experiment-receipt.json']) {
    assert.equal(readFileSync(join(first, file), 'utf8'), readFileSync(join(retry, file), 'utf8'));
  }

  const receipt = json(join(first, 'plg-experiment-receipt.json'));
  const { control, treatment } = receipt.arms;
  assert.equal(control.assigned_account_ids.length, 14);
  assert.equal(treatment.assigned_account_ids.length, 14);
  assert.deepEqual([...control.assigned_account_ids, ...treatment.assigned_account_ids].sort(), [...starIslandCohort].sort());
  assert.deepEqual([control.exposed_account_ids.length, treatment.exposed_account_ids.length], [12, 12]);
  assert.deepEqual([control.coupon_claim_account_ids.length, treatment.coupon_claim_account_ids.length], [0, 8]);
  assert.deepEqual([control.paid_account_ids.length, treatment.paid_account_ids.length], [1, 7]);

  const mapping: unknown = json(join(first, 'replay.mapping.json'));
  validateMapping(mapping);
  const converted = await convertLocalData({
    inputFile: join(first, 'replay.jsonl'), mapping, outputDir: join(dir, 'converted'), now: end,
  });
  assert.equal(converted.status, 'ready');
  const records = rows(join(converted.output_dir, 'valid.ue.jsonl'));
  assert.equal(records.length, 40);
  const sourceRows = rows(join(first, 'replay.jsonl'));
  for (const [index, record] of records.entries()) {
    assert.match(record['#time'], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
    assert.equal(record['#time'], sourceRows[index].time);
  }
  assert.deepEqual(records.map((record) => record['#uuid']), [
    ...receipt.event_uuids.exposure, ...receipt.event_uuids.outcomes,
  ]);
  assert.equal(new Set(records.map((record) => record['#uuid'])).size, 40);
  const exposedAt = new Map<string, number>();
  const claimed = new Set<string>();
  for (const record of records) {
    const account = record['#account_id'];
    const isControl = control.exposed_account_ids.includes(account);
    const arm = isControl ? control : treatment;
    assert(arm.exposed_account_ids.includes(account));
    const timestamp = Date.parse(record['#time'].replace(' ', 'T') + 'Z');
    assert(timestamp >= shortStart.getTime() && timestamp <= end.getTime());
    if (record['#event_name'] === 'te_experiment_exposure') {
      exposedAt.set(account, timestamp);
      assert.deepEqual(record.properties, {
        '#experiment_id': 'experiment', '#experiment_group_id': arm.group_id, '#is_control_group': isControl, '#zone_offset': 0,
      });
      continue;
    }
    assert.equal(timestamp - exposedAt.get(account)!, 5_000);
    assert.equal(record.properties['#experiment_group_id'], undefined);
    assert.equal(record.properties.plg_sample_id, 'star-island');
    assert.equal(record.properties.item_id, 'starlight-bundle');
    assert.equal(record.properties.demo_run_id, 'plg-test');
    if (record['#event_name'] === 'payment_success') {
      assert(arm.paid_account_ids.includes(account));
      assert.equal(record.properties.amount, isControl ? 100 : 80);
      assert.equal(record.properties.currency, 'CNY');
      assert.equal(typeof record.properties.order_id, 'string');
      if (!isControl) assert(claimed.has(account));
    } else {
      assert.equal(record['#event_name'], 'demo_coupon_claim');
      assert(treatment.coupon_claim_account_ids.includes(account));
      claimed.add(account);
    }
  }
});

test('PLG replay validates cohort provenance by sample and permits an odd cohort in Season Pass', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ae-plg-replay-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cohort = join(dir, 'cohort.json');
  const output = join(dir, 'output');
  for (const invalid of [
    ['star-island-user-1'], ['star-island-user-1', 'star-island-user-1'],
    ['star-island-user-1', 'season-pass-user-1'], ['star-island-user-1', 'star-island-user-141'],
    ['star-island-user-1', 'star-island-user-2\n'], ['star-island-user-1', 2],
  ]) {
    writeFileSync(cohort, JSON.stringify(invalid));
    const result = replay(cohort, output);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unique synthetic account IDs/);
    assert.equal(existsSync(output), false);
  }
  const seasonPass = ['season-pass-user-1', 'season-pass-user-2', 'season-pass-user-120'];
  writeFileSync(cohort, JSON.stringify(seasonPass));
  assert.match(replay(cohort, output, { 'sample-id': 'season-pass' }).stderr, /supported Demo sample/);
  assert.equal(existsSync(output), false);
  const result = replay(cohort, output, { 'sample-id': 'season-pass', 'item-id': 'season-pass-item' });
  assert.equal(result.status, 0, result.stderr);
  const { arms } = json(join(output, 'plg-experiment-receipt.json'));
  assert.equal(arms.control.assigned_account_ids.length, 2);
  assert.equal(arms.treatment.assigned_account_ids.length, 1);
});

test('PLG replay validates the exposure day and permits a five-second outcome timestamp', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'ae-plg-replay-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cohort = join(dir, 'cohort.json');
  const output = join(dir, 'output');
  writeFileSync(cohort, JSON.stringify(starIslandCohort));
  const now = new Date('2026-11-11T05:34:00.000Z');
  const end = '2026-11-11T05:33:00.000Z';
  const timezone = '-05:30';
  assert.match(replay(cohort, output, { start: '2026-11-11T05:29:00.000Z', end, timezone }, now).stderr,
    /within today in the project timezone/);
  assert.equal(existsSync(output), false);
  assert.match(replay(cohort, output, { start: '2026-11-11T05:32:55.001Z', end, timezone }, now).stderr,
    /at least 5 seconds long/);
  assert.equal(existsSync(output), false);
  const result = replay(cohort, output, { start: '2026-11-11T05:31:00.000Z', end, timezone }, now);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(json(join(output, 'plg-experiment-receipt.json')).timezone, timezone);
  const nearMidnight = new Date('2026-11-11T05:29:58.000Z');
  const futureOutput = join(dir, 'future');
  const future = { start: nearMidnight.toISOString(), end: '2026-11-11T05:30:03.000Z', timezone };
  assert.match(replay(cohort, futureOutput, { ...future, end: '2026-11-11T05:30:03.001Z' }, nearMidnight).stderr,
    /no later than 5 seconds from now/);
  const immediate = replay(cohort, futureOutput, future, nearMidnight);
  assert.equal(immediate.status, 0, immediate.stderr);
  const events = rows(join(futureOutput, 'replay.jsonl'));
  assert.ok(events.slice(0, 24).every(event => event.time === '2026-11-11 05:29:58.000'));
  assert.ok(events.slice(24).every(event => event.time === '2026-11-11 05:30:03.000'));
});
