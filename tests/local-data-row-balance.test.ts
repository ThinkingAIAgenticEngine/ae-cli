import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectLocalDataInput, selectDataSet } from '../src/commands/data-integration/input.js';
import { convertLocalData } from '../src/commands/data-integration/conversion.js';
import type { LocalDataMapping } from '../src/commands/data-integration/types.js';

// The conservation equation: every streamed data row must land in exactly one bucket. The manifest
// already counts valid and invalid records; what it lacks is the source side of that equation, so a
// row dropped or duplicated between the source and the output would go unnoticed by everyone reading
// the manifest. source_rows closes it.
const dir = mkdtempSync(join(tmpdir(), 'ae-cli-row-balance-'));
let run = 0;

const convert = async (
  name: string,
  csv: string,
  base: LocalDataMapping,
  extra: { salvageFrom?: string } = {},
) => {
  const path = join(dir, name);
  writeFileSync(path, csv, 'utf8');
  const input = await inspectLocalDataInput(path);
  const mapping: LocalDataMapping = {
    ...base,
    source: { sha256: input.sha256, format: 'csv', data_set: selectDataSet(input).id },
  };
  run += 1;
  const outputDir = join(dir, `run-${run}`);
  const converted = await convertLocalData({
    inputFile: path,
    mapping,
    outputDir,
    now: new Date('2026-09-02T00:00:00Z'),
    ...(extra.salvageFrom ? { salvageFrom: extra.salvageFrom } : {}),
  });
  return { path, mapping, converted };
};

const trackMapping = (over: Partial<LocalDataMapping> = {}): LocalDataMapping => ({
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: '', format: 'csv', data_set: '' },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user_id',
  default_event_name: 'order_paid',
  time: { field: '时间', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [],
  ...over,
});

// 1. Every valid row is counted on both sides of the equation.
const allValid = await convert(
  'all-valid.csv',
  [
    'user_id,时间,事件名,金额',
    'u1,2026-03-01 10:00:00,支付,100',
    'u2,2026-03-01 11:00:00,支付,200',
    'u3,2026-03-01 12:00:00,支付,300',
    '',
  ].join('\n'),
  trackMapping(),
);
assert.equal(allValid.converted.manifest.output.source_rows, 3, 'three data rows were fed to conversion');
assert.equal(allValid.converted.manifest.output.valid_records, 3);
assert.equal(allValid.converted.manifest.output.invalid_records, 0);
assert.equal(allValid.converted.manifest.output.source_rows, allValid.converted.manifest.output.valid_records + allValid.converted.manifest.output.invalid_records);

// 2. A row that fails validation is still a source row; the equation holds across both buckets.
const split = await convert(
  'split.csv',
  [
    'user_id,时间,事件名,金额',
    'u1,2026-03-01 10:00:00,支付,100',
    ',2026-03-01 11:00:00,支付,200',
    'u2,2026-03-01 12:00:00,支付,300',
    '',
  ].join('\n'),
  trackMapping(),
);
assert.equal(split.converted.manifest.output.source_rows, 3);
assert.equal(split.converted.manifest.output.valid_records, 2, 'the missing identity quarantines one row');
assert.equal(split.converted.manifest.output.invalid_records, 1);
assert.equal(split.converted.manifest.output.source_rows, split.converted.manifest.output.valid_records + split.converted.manifest.output.invalid_records);

// 3. A title row above the header and the header row itself are not data rows, so they stay out of
// the count — otherwise the equation would be off by the rows the reader itself discarded.
const titled = await convert(
  'titled.csv',
  [
    '华东区订单报表',
    'user_id,时间,事件名,金额',
    'u1,2026-03-01 10:00:00,支付,100',
    'u2,2026-03-01 11:00:00,支付,200',
    '',
  ].join('\n'),
  trackMapping({ skip_rows: 1 }),
);
assert.equal(titled.converted.manifest.output.source_rows, 2, 'skip_rows and the header are not data rows');

// 4. A salvage run streams the whole file but re-processes only the listed rows, so its source side
// is the match count, not the file's row count.
const salvageSource = [
  'user_id,时间,事件名,金额',
  'u1,2026-03-01 10:00:00,支付,100',
  ',2026-03-01 11:00:00,支付,200',
  'u2,2026-03-01 12:00:00,支付,300',
  '',
].join('\n');
const first = await convert('salvage.csv', salvageSource, trackMapping());
assert.equal(first.converted.manifest.output.invalid_records, 1);
const invalidPath = join(first.converted.output_dir, first.converted.manifest.output.invalid_file);
const second = await convert('salvage.csv', salvageSource, trackMapping({ account_id_value: 'placeholder' }), {
  salvageFrom: invalidPath,
});
assert.equal(second.converted.manifest.output.source_rows, 1, 'a salvage run reports only the rows it re-processed');
assert.equal(second.converted.manifest.output.valid_records, 1);
assert.equal(second.converted.manifest.output.invalid_records, 0);
assert.equal(second.converted.manifest.output.source_rows, second.converted.manifest.output.valid_records + second.converted.manifest.output.invalid_records);

// 5. Mixed mode is one row in, one record out: the record type is chosen per row, it never fans a
// row out into a track and a profile record. record_types partitions the valid records rather than
// adding to them.
const mixedMode = await convert(
  'mixed-mode.csv',
  [
    'user_id,type,event,t,金额',
    'u1,事件,open,2026-03-01 10:00:00,100',
    'u2,用户,open,2026-03-01 11:00:00,200',
    'u3,事件,pay,2026-03-01 12:00:00,300',
    '',
  ].join('\n'),
  {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: '', format: 'csv', data_set: '' },
    mode: 'mixed',
    confidence: 'high',
    account_id_field: 'user_id',
    record_type_field: 'type',
    event_name_field: 'event',
    time: { field: 't', format: 'auto', source_timezone: 'Asia/Shanghai' },
    value_mapping: { record_type: { 事件: 'track', 用户: 'user_set' } },
    properties: [],
  },
);
assert.equal(mixedMode.converted.manifest.output.source_rows, 3, 'mixed mode keeps the 1:1 source→record relation');
assert.equal(mixedMode.converted.manifest.output.valid_records, 3);
assert.deepEqual(mixedMode.converted.manifest.output.record_types, { track: 2, user_set: 1 });
const typeSum = Object.values(mixedMode.converted.manifest.output.record_types).reduce((sum, count) => sum + count, 0);
assert.equal(typeSum, mixedMode.converted.manifest.output.valid_records, 'record_types partition the valid records, they do not add to them');
assert.equal(mixedMode.converted.manifest.output.source_rows, mixedMode.converted.manifest.output.valid_records + mixedMode.converted.manifest.output.invalid_records);

process.stdout.write('local data row balance tests: passed\n');
