import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CliValidationError } from '../src/core/errors.js';
import { convertLocalDataMulti } from '../src/commands/data-integration/local-data/conversion.js';
import {
  applyTypeResolutions,
  buildColumnUnion,
  buildPerFileMapping,
  detectColumnTypeConflicts,
  validateTypeResolutions,
} from '../src/commands/data-integration/local-data/multi.js';
import type { MultiFileProfile } from '../src/commands/data-integration/local-data/multi.js';
import type { LocalDataMapping, LocalDataProfile } from '../src/commands/data-integration/local-data/types.js';

const root = mkdtempSync(join(tmpdir(), 'ae-local-data-conflicts-'));
const now = new Date('2026-08-11T00:00:00Z');

function profile(amountType: LocalDataProfile['columns'][number]['inferred_type'], sample: string): LocalDataProfile {
  return {
    version: 'ae-local-data-profile/v1',
    source: { format: 'csv', size_bytes: 1, sha256: 'a'.repeat(64) },
    data_set: { id: '$', kind: 'file', label: '$' },
    row_count: 1,
    column_count: 1,
    columns: [{
      name: 'amount',
      inferred_type: amountType,
      missing_count: 0,
      missing_ratio: 0,
      unique_count: 1,
      unique_ratio: 1,
      unique_count_approximate: false,
      time_parse_count: 0,
      time_parse_ratio: 0,
      samples: [sample],
    }],
    recommended_mapping: {} as LocalDataMapping,
    ue_eligible: false,
    warnings: [],
  };
}

const baseMapping: LocalDataMapping = {
  version: 'ae-local-data-mapping/v1',
  source: { sha256: '*', format: 'csv', data_set: '$' },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'account_id',
  event_name_field: 'event',
  time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [{ source: 'amount', target: 'amount', type: 'number' }],
};

try {
  const files: MultiFileProfile[] = [
    { file: 'a.csv', profile: profile('number', '10') },
    { file: 'b.csv', profile: profile('string', 'abc') },
  ];

  const conflicts = detectColumnTypeConflicts(files);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].column, 'amount');
  assert.equal(conflicts[0].sources.length, 2);
  assert.deepEqual(conflicts[0].sources.map((source) => source.type), ['number', 'string']);

  const union = buildColumnUnion(files);
  const amountUnion = union.find((entry) => entry.column === 'amount');
  assert.ok(amountUnion);
  assert.equal(amountUnion.has_conflict, true);
  assert.deepEqual(amountUnion.per_file_types, { 'a.csv': 'number', 'b.csv': 'string' });

  // validateTypeResolutions accepts unify/split/skip and rejects malformed resolutions.
  validateTypeResolutions({ amount: { action: 'unify', unifiedType: 'string' } }, ['a.csv', 'b.csv']);
  validateTypeResolutions({
    amount: { action: 'split', fileMappings: {
      'a.csv': { ae_name: 'order_value', type: 'number' },
      'b.csv': { ae_name: 'note_text', type: 'string' },
    } },
  }, ['a.csv', 'b.csv']);
  validateTypeResolutions({ amount: { action: 'skip', skipFiles: ['a.csv'] } }, ['a.csv', 'b.csv']);
  assert.throws(
    () => validateTypeResolutions({ amount: { action: 'bogus' } }, ['a.csv', 'b.csv']),
    CliValidationError,
  );
  assert.throws(
    () => validateTypeResolutions({
      amount: { action: 'split', fileMappings: { 'unknown.csv': { ae_name: 'x', type: 'string' } } },
    }, ['a.csv', 'b.csv']),
    CliValidationError,
  );
  assert.throws(
    () => validateTypeResolutions({ amount: { action: 'skip', skipFiles: [] } }, ['a.csv', 'b.csv']),
    CliValidationError,
  );

  // unify applies the type to every file.
  const unified = applyTypeResolutions({ amount: { action: 'unify', unifiedType: 'string' } }, files);
  assert.equal(unified.get('a.csv')!.columnTypes.amount, 'string');
  assert.equal(unified.get('b.csv')!.columnTypes.amount, 'string');

  // split applies per-file targets and types.
  const split = applyTypeResolutions({
    amount: { action: 'split', fileMappings: {
      'a.csv': { ae_name: 'order_value', type: 'number' },
      'b.csv': { ae_name: 'note_text', type: 'string' },
    } },
  }, files);
  assert.equal(split.get('a.csv')!.targets.amount, 'order_value');
  assert.equal(split.get('b.csv')!.targets.amount, 'note_text');
  assert.equal(split.get('b.csv')!.columnTypes.amount, 'string');

  // skip marks the column for exclusion in the listed files only.
  const skipped = applyTypeResolutions({ amount: { action: 'skip', skipFiles: ['a.csv'] } }, files);
  assert.ok(skipped.get('a.csv')!.skipColumns.has('amount'));
  assert.equal(skipped.get('b.csv')!.skipColumns.has('amount'), false);

  // buildPerFileMapping stamps the real fingerprint and merges overrides.
  const perFile = buildPerFileMapping(baseMapping, files[0].profile, unified.get('a.csv')!);
  assert.equal(perFile.source.sha256, 'a'.repeat(64));
  assert.equal(perFile.properties[0].type, 'string');

  // End-to-end: unresolved conflicts are rejected; unify produces per-file UE output.
  const aPath = join(root, 'a.csv');
  const bPath = join(root, 'b.csv');
  writeFileSync(aPath, 'account_id,amount,event,time\nu-1,10,open,2026-08-10 10:00:00\n');
  writeFileSync(bPath, 'account_id,amount,event,time\nu-1,abc,open,2026-08-10 10:00:00\n');

  await assert.rejects(
    convertLocalDataMulti({ inputFiles: [aPath, bPath], mapping: baseMapping, now }),
    (error: unknown) => error instanceof CliValidationError
      && error.code === 'LOCAL_DATA_TYPE_CONFLICTS_UNRESOLVED',
  );

  const result = await convertLocalDataMulti({
    inputFiles: [aPath, bPath],
    mapping: baseMapping,
    typeResolutions: { amount: { action: 'unify', unifiedType: 'string' } },
    outputDir: join(root, 'out'),
    now,
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.files.length, 2);
  const aResult = result.files.find((file) => file.file === 'a.csv')!;
  const bResult = result.files.find((file) => file.file === 'b.csv')!;
  assert.equal(aResult.manifest.output.valid_records, 1);
  assert.equal(bResult.manifest.output.valid_records, 1);
  const aLine = JSON.parse(readFileSync(join(aResult.output_dir, 'valid.ue.jsonl'), 'utf8').trim());
  const bLine = JSON.parse(readFileSync(join(bResult.output_dir, 'valid.ue.jsonl'), 'utf8').trim());
  assert.equal(aLine.properties.amount, '10');
  assert.equal(bLine.properties.amount, 'abc');

  process.stdout.write('local data conflicts and resolutions tests: passed\n');
} finally {
  rmSync(root, { recursive: true, force: true });
}
