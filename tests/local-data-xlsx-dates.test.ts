import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  inspectLocalDataInput,
  selectDataSet,
  streamLocalDataRows,
} from '../src/commands/data-integration/input.js';
import { profileLocalData } from '../src/commands/data-integration/profile.js';
import { convertRow } from '../src/commands/data-integration/conversion.js';
import type { LocalDataMapping, LocalDataRow } from '../src/commands/data-integration/types.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));

const column = (
  profile: Awaited<ReturnType<typeof profileLocalData>>,
  name: string,
) => profile.columns.find((candidate) => candidate.name === name);

// A date-formatted XLSX cell must reach the profile as a timestamp, not as the Excel serial
// number behind it. Chinese column names are real business data (exempt from the English rule)
// and are the point of the fixture: `注册日期` misses profile.ts' TIME_NAMES list, so a serial
// would profile as `number` and make the file look like it has no time column at all.
const formats = fixture('26_xlsx_date_formats.xlsx');
const formatsInput = await inspectLocalDataInput(formats);
const formatsProfile = await profileLocalData(
  formatsInput,
  selectDataSet(formatsInput),
  'Asia/Shanghai',
  { collectSamples: true },
);

assert.equal(column(formatsProfile, '注册日期')?.inferred_type, 'datetime');
assert.equal(column(formatsProfile, '注册日期')?.time_parse_ratio, 1);
assert.deepEqual(column(formatsProfile, '注册日期')?.samples, ['2026-03-04', '2026-03-05', '2025-12-31']);
assert.equal(column(formatsProfile, 'event_time')?.inferred_type, 'datetime');
assert.equal(column(formatsProfile, 'event_time')?.samples?.[0], '2026-03-04 05:06:07');
// An elapsed-duration format ([h]:mm:ss, and builtins 45-47) also satisfies ExcelJS'
// `isDateFmt`, so serving it as a date would turn 12 hours into a date in 1899.
assert.equal(column(formatsProfile, '耗时')?.inferred_type, 'number');
assert.deepEqual(column(formatsProfile, '耗时')?.samples?.slice(0, 2), ['0.5', '1.25']);
assert.equal(column(formatsProfile, 'amount')?.inferred_type, 'number');
// Without the fix there is no parseable time field at all.
assert.equal(formatsProfile.ue_eligible, true);
assert.equal(formatsProfile.recommended_mapping.time.field, 'event_time');

// The type change is not silent: inspect names every affected column, because a column that
// used to profile as `number` may already have been uploaded to AE under that type.
const dateWarning = formatsProfile.warnings.find((warning) => warning.includes('Excel number format'));
assert.ok(dateWarning, 'a date-formatted column must be reported in warnings');
assert.match(dateWarning, /注册日期/);
assert.match(dateWarning, /event_time/);
assert.doesNotMatch(dateWarning, /耗时/);
assert.match(dateWarning, /number properties/);

// The 1904 epoch shifts every serial by 1462 days. Reading it as 1900 would land these rows
// in 2022 — a bug that stayed invisible while no cell was converted to a date at all.
const epoch = fixture('27_xlsx_date1904.xlsx');
const epochInput = await inspectLocalDataInput(epoch);
const epochProfile = await profileLocalData(epochInput, selectDataSet(epochInput), 'Asia/Shanghai', {
  collectSamples: true,
});
assert.deepEqual(column(epochProfile, '注册日期')?.samples, ['2026-03-04', '2026-03-05']);

// ExcelJS builds a date cell so that its *UTC* components carry the wall clock the user sees in
// Excel; the instant itself is meaningless. conversion.ts treats a real `Date` as an absolute
// instant, so passing one through would shift every timestamp by the source's UTC offset. The
// reader emits a naive wall-clock string instead, and these assertions are what pins that down:
// the same cell must yield the same wall clock under any source timezone.
const rows: LocalDataRow[] = [];
await streamLocalDataRows(formatsInput, selectDataSet(formatsInput), (row) => { rows.push(row); });
assert.equal(rows.length, 3);
assert.equal(rows[0].event_time, '2026-03-04 05:06:07');
assert.equal(rows[0]['注册日期'], '2026-03-04');
assert.equal(rows[0]['耗时'], 0.5);

const mappingFor = (timezone: string): LocalDataMapping => ({
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: formatsInput.sha256, format: 'xlsx', data_set: 'events' },
  mode: 'track',
  confidence: 'high',
  account_id_field: '用户ID',
  default_event_name: 'signup',
  time: { field: 'event_time', format: 'auto', source_timezone: timezone },
  properties: [{ source: '注册日期', target: 'signup_date', type: 'datetime' }],
});

for (const timezone of ['Asia/Shanghai', 'UTC', 'America/New_York']) {
  const converted = convertRow(rows[0], 1, mappingFor(timezone), new Date('2026-09-02T00:00:00Z'));
  assert.ok(converted.ok, `row must convert under ${timezone}`);
  assert.equal(converted.record['#time'], '2026-03-04 05:06:07.000', `wall clock must survive ${timezone}`);
  assert.equal(converted.record.properties.signup_date, '2026-03-04 00:00:00.000');
}

process.stdout.write('local data xlsx date tests: passed\n');
