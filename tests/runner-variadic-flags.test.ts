import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'ae-local-data-variadic-'));
try {
  const aPath = join(root, 'a.csv');
  const bPath = join(root, 'b.csv');
  writeFileSync(aPath, 'account_id,amount,event,time\nu-1,10,open,2026-08-10 10:00:00\n');
  writeFileSync(bPath, 'account_id,amount,event,time\nu-1,abc,open,2026-08-10 10:00:00\n');

  const wildcard = join(root, 'wildcard.json');
  writeFileSync(wildcard, JSON.stringify({
    version: 'ae-local-data-mapping/v1',
    source: { sha256: '*', format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'account_id',
    event_name_field: 'event',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    properties: [{ source: 'amount', target: 'amount', type: 'number' }],
  }));

  const pinned = join(root, 'pinned.json');
  writeFileSync(pinned, JSON.stringify({
    version: 'ae-local-data-mapping/v1',
    source: { sha256: 'a'.repeat(64), format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'account_id',
    event_name_field: 'event',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    properties: [{ source: 'amount', target: 'amount', type: 'number' }],
  }));

  const cliHome = join(root, 'cli-home');
  mkdirSync(cliHome);

  const run = (args: string[]) => spawnSync(process.execPath, [
    '--import', 'tsx', 'src/index.ts', '--no-update-check', '--dry-run',
    'data-integration', 'convert', ...args,
  ], { cwd: process.cwd(), env: { ...process.env, HOME: cliHome }, encoding: 'utf8' });

  // Two --input-file values are collected into one array.
  const multi = run([
    '--input-file', aPath,
    '--input-file', bPath,
    '--mapping', wildcard,
  ]);
  assert.equal(multi.status, 0, multi.stderr);
  assert.match(multi.stdout, /"action":\s*"convert_local_data_multi"/);
  assert.match(multi.stdout, /"file_count":\s*2/);

  // A single --input-file keeps the single-file command path.
  const single = run(['--input-file', aPath, '--mapping', pinned]);
  assert.equal(single.status, 0, single.stderr);
  assert.match(single.stdout, /"action":\s*"convert_local_data"/);

  // A missing required variadic flag is reported as a validation error naming the flag.
  const missing = run(['--mapping', pinned]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /input-file/);

  process.stdout.write('runner variadic flag tests: passed\n');
} finally {
  rmSync(root, { recursive: true, force: true });
}
