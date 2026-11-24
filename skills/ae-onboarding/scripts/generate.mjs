import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { isDemoAccountId, resolveExperimentPreset } from './resolve-experiment-preset.mjs';

const dayMs = 86_400_000;
const minuteMs = 60_000;
const outcomeDelayMs = 5_000;

function main() {
  const { values: args } = parseArgs({
    options: Object.fromEntries([
      'phase', 'run-id', 'output-dir', 'start', 'end', 'timezone', 'experiment-id', 'control-id', 'treatment-id',
      'cohort-file', 'sample-id', 'item-id', 'industry', 'experiment-type', 'currency',
    ].map((name) => [name, { type: 'string' }])),
  });
  if (args.phase !== 'plg-experiment-today') {
    throw new Error('Pass --phase plg-experiment-today for a confirmed PLG experiment.');
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(args['run-id'] ?? '') || !args['output-dir']) {
    throw new Error('Pass --run-id <slug> and --output-dir <new directory>.');
  }

  const start = Date.parse(args.start);
  const end = Date.parse(args.end);
  const now = Date.now();
  const earliest = now - 3 * 365 * dayMs;
  const utcTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  if (!utcTimestamp.test(args.start ?? '') || !Number.isFinite(start)
      || start < earliest || start > now) {
    throw new Error('--start must be a UTC ISO timestamp between three years ago and now.');
  }
  if (!args.timezone) {
    throw new Error('For plg-experiment-today, pass the project reporting timezone with --timezone.');
  }
  const date = reportingDate(args.timezone);
  const today = date(now);
  if (!utcTimestamp.test(args.end ?? '') || !Number.isFinite(end)
      || start + outcomeDelayMs > end || end > now + outcomeDelayMs || date(start) !== today) {
    throw new Error('For plg-experiment-today, pass an interval starting within today in the project timezone, at least 5 seconds long and ending no later than 5 seconds from now.');
  }

  const { 'experiment-id': experimentId, 'control-id': controlId, 'treatment-id': treatmentId } = args;
  if (![experimentId, controlId, treatmentId].every((id) => id?.trim()) || controlId === treatmentId) {
    throw new Error('Pass verified --experiment-id, --control-id, and --treatment-id for the saved Feature experiment.');
  }
  generatePlgReplay(args, start);
}

function reportingDate(timezone) {
  const offset = /^([+-])([01]\d|2[0-3]):([0-5]\d)$/.exec(timezone);
  if (offset && offset[0] === timezone) {
    const sign = offset[1] === '-' ? -1 : 1;
    const adjustment = sign * (Number(offset[2]) * 60 + Number(offset[3])) * minuteMs;
    return (time) => new Date(time + adjustment).toISOString().slice(0, 10);
  }
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, dateStyle: 'short' }).format;
}

function generatePlgReplay(args, start) {
  const {
    'sample-id': sampleId, 'item-id': itemId, 'cohort-file': cohortFile, 'run-id': runId, 'output-dir': outputDir,
    'experiment-id': experimentId, 'control-id': controlId, 'treatment-id': treatmentId,
  } = args;
  if (!cohortFile) throw new Error('Pass --cohort-file for the selected Demo sample.');
  const { preset, sample, industry, experimentType, currency } = resolveExperimentPreset({
    industry: args.industry, experimentType: args['experiment-type'], sampleId, itemId, currency: args.currency,
  });
  const { exposureProperties, events } = preset;
  const cohort = JSON.parse(readFileSync(cohortFile, 'utf8'));
  if (!Array.isArray(cohort) || cohort.length < 2 || new Set(cohort).size !== cohort.length
      || !cohort.every(id => isDemoAccountId(id, sampleId, sample.userCount))) {
    throw new Error('The cohort must contain at least two unique synthetic account IDs for the selected PLG sample.');
  }

  const replayIdentity = [sampleId, itemId, runId, experimentId];
  const ranked = cohort.map((id) => ({ id, rank: digest(['assignment', ...replayIdentity, id]).toString('hex') }))
    .sort((left, right) => left.rank.localeCompare(right.rank) || left.id.localeCompare(right.id))
    .map(({ id }) => id);
  const split = Math.ceil(ranked.length / 2);
  const exposure = [];
  const outcomes = [];
  const tags = { plg_sample_id: sampleId, item_id: itemId, demo_run_id: runId };
  const event = (accountId, groupId, offset, eventName, properties) => ({
    account_id: accountId,
    time: new Date(start + offset).toISOString().slice(0, -1).replace('T', ' '),
    event_name: eventName,
    event_uuid: stableUuid(['event', ...replayIdentity, groupId, accountId, eventName]),
    ...properties,
  });
  const arms = {};
  for (const [name, groupId, assigned, isControl] of [
    ['control', controlId, ranked.slice(0, split), true],
    ['treatment', treatmentId, ranked.slice(split), false],
  ]) {
    const config = preset.arms[name];
    const exposed = assigned.slice(0, config.exposureLimit ?? assigned.length);
    const claims = events.couponClaim ? exposed.slice(0, config.couponClaims) : [];
    const paid = (events.couponClaim && !isControl ? claims : exposed).slice(0, config.paidUsers);
    exposed.forEach((id) => exposure.push(event(id, groupId, 0, events.exposure, {
      experiment_id: experimentId, experiment_group_id: groupId, is_control_group: isControl,
    })));
    claims.forEach((id) => outcomes.push(event(id, groupId, outcomeDelayMs, events.couponClaim, tags)));
    paid.forEach((id) => outcomes.push(event(id, groupId, outcomeDelayMs, events.payment, {
      ...tags, order_id: stableUuid(['order', ...replayIdentity, groupId, id]), amount: config.price, currency,
    })));
    arms[name] = {
      group_id: groupId, assigned_account_ids: assigned, exposed_account_ids: exposed,
      coupon_claim_account_ids: claims, paid_account_ids: paid,
    };
  }
  const rows = [...exposure, ...outcomes];
  const properties = [
    ...exposureProperties,
    ['plg_sample_id', 'string'], ['item_id', 'string'], ['demo_run_id', 'string'],
    ['order_id', 'string'], ['amount', 'number'], ['currency', 'string'],
  ];
  const receipt = {
    version: 'ae-plg-demo-experiment-replay/v1', synthetic: true, phase: args.phase, run_id: runId,
    sample_id: sampleId, item_id: itemId, industry, experiment_type: experimentType, currency,
    experiment_id: experimentId, timezone: args.timezone,
    start: args.start, end: args.end, arms,
    event_uuids: { exposure: exposure.map((row) => row.event_uuid), outcomes: outcomes.map((row) => row.event_uuid) },
  };
  const receiptName = 'plg-experiment-receipt.json';
  writeReplay(outputDir, rows, properties, receiptName, receipt);
  console.log(JSON.stringify({
    synthetic: true, phase: args.phase, run_id: runId, sample_id: sampleId, item_id: itemId,
    experiment_id: experimentId, receipt: receiptName, files: { replay: rows.length },
  }, null, 2));
}

function digest(parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest();
}

function stableUuid(parts) {
  const bytes = digest(parts).subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function writeReplay(outputDir, rows, properties, receiptName, receipt) {
  mkdirSync(outputDir, { mode: 0o700 });
  const source = rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
  writeFileSync(join(outputDir, 'replay.jsonl'), source);
  const mapping = {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: createHash('sha256').update(source).digest('hex'), format: 'jsonl', data_set: '$' },
    mode: 'track', confidence: 'high', account_id_field: 'account_id',
    time: { field: 'time', format: 'auto', source_timezone: 'UTC' },
    uuid_field: 'event_uuid',
    zone_offset_value: 0,
    event_name_field: 'event_name',
    properties: properties.map(([column, type, target = column]) => ({ source: column, target, type })),
  };
  writeFileSync(join(outputDir, 'replay.mapping.json'), JSON.stringify(mapping, null, 2) + '\n');
  writeFileSync(join(outputDir, receiptName), JSON.stringify(receipt, null, 2) + '\n');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
