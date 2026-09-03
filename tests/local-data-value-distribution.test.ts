import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectLocalDataInput, selectDataSet } from '../src/commands/data-integration/input.js';
import { profileLocalData } from '../src/commands/data-integration/profile.js';

// A profile that reports only "how many distinct values" cannot answer the question the user
// actually has about a column: is `渠道` a three-value enum worth uploading as a property, is
// `金额` money or a cumulative running total, is `备注` free text nobody will ever query. Value
// frequency and a numeric distribution answer those — and both print values read out of the file,
// so they must stay on the inspect path and out of the convert manifest.
const dir = mkdtempSync(join(tmpdir(), 'ae-cli-distribution-'));

const profileOf = async (name: string, csv: string, collectSamples: boolean) => {
  const path = join(dir, name);
  writeFileSync(path, csv, 'utf8');
  const input = await inspectLocalDataInput(path);
  return profileLocalData(input, selectDataSet(input), 'Asia/Shanghai', { collectSamples });
};

// 1. A low-cardinality column gets an exact table, ordered by count.
const ROWS = 60;
const channelFor = (index: number): string => (index % 6 === 0 ? '线下门店' : index % 2 === 0 ? '自然流量' : '广告投放');
const lines = ['user_id,渠道,金额'];
for (let index = 0; index < ROWS; index += 1) {
  lines.push(`u${index},${channelFor(index)},${index + 1}`);
}
const profile = await profileOf('channels.csv', `${lines.join('\n')}\n`, true);
const channel = profile.columns.find((column) => column.name === '渠道');
assert.ok(channel?.value_frequency, '渠道 must report a value-frequency table');
assert.deepEqual(
  channel.value_frequency.map((entry) => [entry.value, entry.count]),
  [['广告投放', 30], ['自然流量', 20], ['线下门店', 10]],
  'the table must be exact and ordered most frequent first',
);
assert.equal(channel.value_frequency[0].ratio, 0.5, 'the ratio is the share of non-missing rows');
assert.equal(
  channel.value_frequency.reduce((sum, entry) => sum + entry.count, 0),
  ROWS,
  'a fully tracked column accounts for every non-missing row',
);

// 2. The numeric distribution: exact totals, and a median that separates a measure from a
// cumulative snapshot. 1..60 sums to 1830, and its median sits mid-range.
const amount = profile.columns.find((column) => column.name === '金额');
assert.ok(amount?.numeric_summary, '金额 must report a numeric distribution');
assert.deepEqual(
  { ...amount.numeric_summary },
  {
    count: 60,
    min: 1,
    max: 60,
    sum: 1830,
    mean: 30.5,
    p25: 15.75,
    median: 30.5,
    p75: 45.25,
    quantiles_approximate: false,
  },
  'the distribution of 1..60 must be reported exactly',
);

// 3. A numeric user ID is an identifier, not a measure: summing it is meaningless, so the column
// stays a string and reports no distribution. Its values are also all distinct, so there is no
// frequency to report either — a table of 1s is a value dump, not a finding.
const userId = profile.columns.find((column) => column.name === 'user_id');
assert.equal(userId?.numeric_summary, undefined, 'an ID column must not report a numeric distribution');
assert.equal(userId?.value_frequency, undefined, 'an all-distinct column must not report a frequency table');

// 4. Float totals must read as money, not as accumulated float noise.
const money = await profileOf('money.csv', 'user_id,金额\nu1,0.1\nu2,0.2\nu3,45.3\n', true);
assert.equal(money.columns.find((column) => column.name === '金额')?.numeric_summary?.sum, 45.6);

// 5. A high-cardinality column reports no table at all. Reporting the top values of a column with
// thousands of distinct ones would name whichever happened to be counted first and read as a
// finding; and it is exactly the column whose values must not be dumped into the report.
const noteLines = ['user_id,备注'];
for (let index = 0; index < 500; index += 1) noteLines.push(`u${index},客户第${index}号备注`);
const notes = await profileOf('notes.csv', `${noteLines.join('\n')}\n`, true);
const note = notes.columns.find((column) => column.name === '备注');
assert.equal(note?.value_frequency, undefined, 'a column past the tracked budget reports no table');
assert.equal(note?.unique_count, 500, 'the distinct count still reports what the frequency table cannot');

// 6. Neither field may reach the convert manifest, which is what upload reads: the manifest carries
// the mapping, never the file's values.
const converted = await profileOf('channels-convert.csv', `${lines.join('\n')}\n`, false);
for (const column of converted.columns) {
  assert.equal(column.samples, undefined, `${column.name} must not carry samples off the inspect path`);
  assert.equal(column.value_frequency, undefined, `${column.name} must not carry value_frequency off the inspect path`);
  assert.equal(column.numeric_summary, undefined, `${column.name} must not carry numeric_summary off the inspect path`);
}

// 7. Past the retained budget the quantiles come from a sample and say so, while the totals stay
// exact — the sum is what a summary-row check compares against, so it may never be an estimate.
const bigLines = ['user_id,金额'];
for (let index = 1; index <= 6000; index += 1) bigLines.push(`u${index},${index}`);
const big = await profileOf('big.csv', `${bigLines.join('\n')}\n`, true);
const bigAmount = big.columns.find((column) => column.name === '金额')?.numeric_summary;
assert.ok(bigAmount, '金额 must still report a distribution past the retained budget');
assert.equal(bigAmount.quantiles_approximate, true, 'sampled quantiles must be flagged');
assert.equal(bigAmount.count, 6000);
assert.equal(bigAmount.sum, 18_003_000, 'the total must count every value, not the sample');
assert.equal(bigAmount.min, 1);
assert.equal(bigAmount.max, 6000);
// The sample is uniform, so its median tracks the real one (3000.5) closely; the tolerance is wide
// enough that a passing run means the reservoir is unbiased, not that the check is toothless.
assert.ok(
  Math.abs(bigAmount.median - 3000.5) < 150,
  `a uniform sample's median must track the column's (got ${bigAmount.median})`,
);

process.stdout.write('local data value distribution tests: passed\n');
