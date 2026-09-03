import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectLocalDataInput, selectDataSet } from '../src/commands/data-integration/input.js';
import { profileLocalData } from '../src/commands/data-integration/profile.js';
import { convertLocalData } from '../src/commands/data-integration/conversion.js';
import type { LocalDataMapping } from '../src/commands/data-integration/types.js';

// A customer re-exports a report that already covers part of the previous export's range, or pastes
// two sheets together. Uploaded, every repeated row becomes a second event AE has no way to un-send:
// revenue doubles for those users and every funnel counts them twice. The rows are indistinguishable
// from real data by then, so the scan before upload is the only place this can be caught.
const dir = mkdtempSync(join(tmpdir(), 'ae-cli-duplicate-keys-'));

const profileOf = async (name: string, csv: string) => {
  const path = join(dir, name);
  writeFileSync(path, csv, 'utf8');
  const input = await inspectLocalDataInput(path);
  return profileLocalData(input, selectDataSet(input), 'Asia/Shanghai', { collectSamples: true });
};

// 1. The canonical shape: one row appended twice. The group must name both row ordinals, count the
// extra copy, and carry no trace of the key's own values.
const repeated = await profileOf(
  'repeated.csv',
  [
    'user_id,时间,事件名,金额',
    'u1,2026-03-01 10:00:00,支付,100',
    'u2,2026-03-01 11:00:00,支付,200',
    'u1,2026-03-01 10:00:00,支付,100',
    '',
  ].join('\n'),
);
assert.ok(repeated.duplicate_keys, 'a repeated identity+time+event row must be reported');
assert.deepEqual(repeated.duplicate_keys.key_columns, ['user_id', '时间', '事件名']);
assert.equal(repeated.duplicate_keys.checked_rows, 3);
assert.equal(repeated.duplicate_keys.duplicate_groups, 1);
assert.equal(repeated.duplicate_keys.extra_rows, 1, 'one surplus record would reach AE');
assert.deepEqual(repeated.duplicate_keys.groups[0].rows, [1, 3], 'both ordinals, in file order');
assert.equal(repeated.duplicate_keys.groups[0].count, 2);
assert.match(repeated.duplicate_keys.groups[0].key_hash, /^[0-9a-f]{16}$/);
// The key's values are the one thing that must never leave the file.
const reportText = JSON.stringify(repeated.duplicate_keys);
assert.equal(reportText.includes('u1'), false, 'no identity value may be reported');
assert.equal(reportText.includes('2026-03-01'), false, 'no time value may be reported');
assert.equal(reportText.includes('支付'), false, 'no event name value may be reported');

// 2. Reported, never removed: the repeated row stays in the row count and in the column's numbers.
// A filter here would delete a real pair of records (two order lines in the same checkout second).
assert.equal(repeated.row_count, 3, 'the repeated row is still a row');
const amount = repeated.columns.find((column) => column.name === '金额');
assert.equal(amount?.numeric_summary?.sum, 400, 'the repeat is counted in the total, which is the finding');
const warning = repeated.warnings.find((entry) => entry.includes('business key'));
assert.ok(warning, 'the finding must reach the user as a warning, not only as a field');
assert.match(warning, /Nothing was removed/);
assert.match(warning, /no way to un-send/);
assert.match(warning, /user_id \+ 时间 \+ 事件名/, 'the key must be stated; a scan whose key is unknown is unreadable');
assert.match(warning, /rows 1, 3/);
assert.equal(warning.includes('u1'), false, 'the warning may not carry key values either');

// 3. A file with no repeats reports nothing. An always-on field would train the agent to ignore it.
const clean = await profileOf(
  'clean.csv',
  [
    'user_id,时间,事件名',
    'u1,2026-03-01 10:00:00,支付',
    'u2,2026-03-01 10:00:00,支付',
    'u1,2026-03-01 10:00:01,支付',
    '',
  ].join('\n'),
);
assert.equal(clean.duplicate_keys, undefined, 'distinct keys are not a finding');

// 4. Same user, same second, different event is not a repeat — the event name is part of the key.
const differentEvent = await profileOf(
  'different-event.csv',
  [
    'user_id,时间,事件名',
    'u1,2026-03-01 10:00:00,登录',
    'u1,2026-03-01 10:00:00,支付',
    '',
  ].join('\n'),
);
assert.equal(differentEvent.duplicate_keys, undefined, 'the event name distinguishes the two rows');

// 5. Without an event-name column the key is identity + time, so the same user at the same instant
// is a repeat. This is the shape most re-export overlaps take.
const noEventColumn = await profileOf(
  'no-event.csv',
  [
    'user_id,时间,金额',
    'u1,2026-03-01 10:00:00,100',
    'u1,2026-03-01 10:00:00,100',
    'u2,2026-03-01 10:00:00,200',
    '',
  ].join('\n'),
);
assert.deepEqual(noEventColumn.duplicate_keys?.key_columns, ['user_id', '时间']);
assert.deepEqual(noEventColumn.duplicate_keys?.groups[0].rows, [1, 2]);

// 6. A key needs more than one column. Identity alone would call every returning user's second row a
// duplicate, which is what a normal event file looks like.
const noTimeColumn = await profileOf(
  'no-time.csv',
  [
    'user_id,金额',
    'u1,100',
    'u1,200',
    '',
  ].join('\n'),
);
assert.equal(noTimeColumn.duplicate_keys, undefined, 'identity alone is not a business key');

// 7. Rows missing part of their key identify nothing, so they are not compared — otherwise every
// blank-identity row would be a duplicate of every other one, drowning the real finding.
const blankKeys = await profileOf(
  'blank-keys.csv',
  [
    'user_id,时间,事件名',
    ',2026-03-01 10:00:00,支付',
    ',2026-03-01 10:00:00,支付',
    'u1,2026-03-01 10:00:00,支付',
    '',
  ].join('\n'),
);
assert.equal(blankKeys.duplicate_keys, undefined, 'incomplete keys are skipped, not compared');
assert.equal(
  (await profileOf(
    'blank-keys-counted.csv',
    [
      'user_id,时间,事件名',
      ',2026-03-01 10:00:00,支付',
      'u1,2026-03-01 10:00:00,支付',
      'u1,2026-03-01 10:00:00,支付',
      '',
    ].join('\n'),
  )).duplicate_keys?.checked_rows,
  2,
  'checked_rows must exclude the skipped row, so the ratio the user reads is honest',
);

// 8. Three copies are one group of three, not two groups. The count is what tells the user how much
// surplus an upload would carry.
const triple = await profileOf(
  'triple.csv',
  [
    'user_id,时间,事件名',
    'u1,2026-03-01 10:00:00,支付',
    'u1,2026-03-01 10:00:00,支付',
    'u1,2026-03-01 10:00:00,支付',
    '',
  ].join('\n'),
);
assert.equal(triple.duplicate_keys?.duplicate_groups, 1);
assert.equal(triple.duplicate_keys?.groups[0].count, 3);
assert.equal(triple.duplicate_keys?.extra_rows, 2, 'two of the three would be surplus');
assert.deepEqual(triple.duplicate_keys?.groups[0].rows, [1, 2, 3]);

// 9. Values are compared as written. Two spellings of the same instant are two keys — a limitation
// the warning states rather than a normalization the tool performs silently.
const spellings = await profileOf(
  'spellings.csv',
  [
    'user_id,时间,事件名',
    'u1,2026-03-01 10:00:00,支付',
    'u1,2026/03/01 10:00:00,支付',
    '',
  ].join('\n'),
);
assert.equal(spellings.duplicate_keys, undefined, 'no time normalization is applied to the key');

// 10. The convert path keys on the mapping's own columns rather than on column names, because those
// are the values AE will actually receive as identity, time, and event.
const mappedPath = join(dir, 'mapped.csv');
writeFileSync(
  mappedPath,
  [
    'member,下单时间,行为,金额',
    'm1,2026-03-01 10:00:00,order_paid,100',
    'm1,2026-03-01 10:00:00,order_paid,100',
    'm2,2026-03-01 11:00:00,order_paid,200',
    '',
  ].join('\n'),
  'utf8',
);
const mappedInput = await inspectLocalDataInput(mappedPath);
const mapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: mappedInput.sha256, format: 'csv', data_set: selectDataSet(mappedInput).id },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'member',
  event_name_field: '行为',
  time: { field: '下单时间', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [{ source: '金额', target: 'amount', type: 'number' }],
};
const converted = await convertLocalData({
  inputFile: mappedPath,
  mapping,
  outputDir: join(dir, 'mapped-out'),
  now: new Date('2026-09-02T00:00:00Z'),
});
assert.equal(converted.manifest.output.valid_records, 3, 'a repeated row converts like any other row');
// 11. The finding must reach the manifest: upload reads it, and by then both copies are ordinary
// valid records with a plausible identity and time. The manifest is the last stop before AE.
assert.deepEqual(converted.manifest.output.duplicate_keys?.key_columns, ['member', '下单时间', '行为']);
assert.equal(converted.manifest.output.duplicate_keys?.extra_rows, 1);
assert.deepEqual(converted.manifest.output.duplicate_keys?.groups[0].rows, [1, 2]);
assert.equal(
  JSON.stringify(converted.manifest.output.duplicate_keys).includes('m1'),
  false,
  'the manifest may not carry key values',
);

process.stdout.write('local data duplicate key tests: passed\n');
