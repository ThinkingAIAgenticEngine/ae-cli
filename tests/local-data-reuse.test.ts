import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HANDOFF_INDEX_VERSION,
  structureFingerprint,
} from '../src/commands/data-integration/handoff.js';
import type { HandoffIndexEntry } from '../src/commands/data-integration/handoff.js';
import { inspectLocalDataInput, selectDataSet } from '../src/commands/data-integration/input.js';
import { profileLocalData } from '../src/commands/data-integration/profile.js';
import { detectReuse } from '../src/commands/data-integration/reuse.js';
import {
  findReuseRoot,
  globalHandoffDir,
  upwardHandoffDirs,
} from '../src/commands/data-integration/handoff-root.js';
import type { LocalDataMapping } from '../src/commands/data-integration/types.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));

const baseMapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: 'a'.repeat(64), format: 'csv', data_set: '$' },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user_id',
  default_event_name: 'purchase',
  time: { field: 'order_time', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [
    { source: 'amount', target: 'amount', type: 'number' },
    { source: 'city', target: 'city', type: 'string' },
  ],
};

// A same-shape candidate with different content and a filename-derived event
// name still matches (default_event_name is business logic, not structure).
const candidate: LocalDataMapping = {
  ...baseMapping,
  source: { ...baseMapping.source, sha256: 'b'.repeat(64) },
  default_event_name: 'b_file',
};

const entryFor = (fingerprint: string, overrides: Partial<HandoffIndexEntry> = {}): HandoffIndexEntry => ({
  fingerprint,
  created_at: '2026-08-19T00:00:00.000Z',
  source_sha256: baseMapping.source.sha256,
  format: 'csv',
  data_set: '$',
  mode: 'track',
  property_count: 2,
  mapping_file: `${fingerprint.slice(0, 16)}/mapping.json`,
  ...overrides,
});

// A matching entry is returned with the frozen event name and a runnable command.
{
  const dir = mkdtempSync(join(tmpdir(), 'reuse-test-'));
  try {
    const fingerprint = structureFingerprint(baseMapping);
    const dirName = fingerprint.slice(0, 16);
    mkdirSync(join(dir, dirName), { recursive: true });
    writeFileSync(join(dir, dirName, 'mapping.json'), JSON.stringify(baseMapping));
    writeFileSync(
      join(dir, 'index.json'),
      JSON.stringify({ version: HANDOFF_INDEX_VERSION, entries: [entryFor(fingerprint, { plan_file: `${dirName}/plan.json` })] }),
    );

    const result = detectReuse(candidate, dir);
    assert.equal(result.matched, true);
    assert.ok(result.match);
    assert.equal(result.match.default_event_name, 'purchase');
    assert.equal(result.match.plan_file, `${dirName}/plan.json`);
    assert.match(result.match.run, /transform\.mjs <new-input-file> \[<output-dir>\]/);
    assert.ok(result.match.run.startsWith(`node ${join(dir, dirName, 'transform.mjs')} `));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// A matched entry whose frozen mapping is missing still matches (best-effort event name).
{
  const dir = mkdtempSync(join(tmpdir(), 'reuse-test-'));
  try {
    const fingerprint = structureFingerprint(baseMapping);
    writeFileSync(
      join(dir, 'index.json'),
      JSON.stringify({ version: HANDOFF_INDEX_VERSION, entries: [entryFor(fingerprint)] }),
    );

    const result = detectReuse(candidate, dir);
    assert.equal(result.matched, true);
    assert.ok(result.match);
    assert.equal(result.match.default_event_name, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// A different shape does not match.
{
  const dir = mkdtempSync(join(tmpdir(), 'reuse-test-'));
  try {
    const fingerprint = structureFingerprint(baseMapping);
    writeFileSync(
      join(dir, 'index.json'),
      JSON.stringify({ version: HANDOFF_INDEX_VERSION, entries: [entryFor(fingerprint)] }),
    );
    const other: LocalDataMapping = {
      ...candidate,
      properties: [...candidate.properties, { source: 'extra', target: 'extra', type: 'string' }],
    };

    const result = detectReuse(other, dir);
    assert.equal(result.matched, false);
    assert.equal(result.match, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// No index at all → no match, no error.
{
  const dir = mkdtempSync(join(tmpdir(), 'reuse-test-'));
  try {
    const result = detectReuse(candidate, dir);
    assert.equal(result.matched, false);
    assert.equal(result.match, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// findReuseRoot: the nearest package wins, found from the cwd or an ancestor.
{
  const root = mkdtempSync(join(tmpdir(), 'reuse-root-'));
  try {
    const nested = join(root, 'a', 'b');
    mkdirSync(join(nested, '.ae-cli', 'data-integration'), { recursive: true });
    writeFileSync(join(nested, '.ae-cli', 'data-integration', 'index.json'), '{}');
    assert.equal(findReuseRoot(nested), join(nested, '.ae-cli', 'data-integration'));
    const deeper = join(nested, 'c');
    mkdirSync(deeper, { recursive: true });
    assert.equal(findReuseRoot(deeper), join(nested, '.ae-cli', 'data-integration'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// findReuseRoot falls back to the global directory when nothing exists upward.
{
  const dir = mkdtempSync(join(tmpdir(), 'reuse-empty-'));
  try {
    assert.equal(findReuseRoot(dir), globalHandoffDir());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// upwardHandoffDirs walks from the start directory to the filesystem root.
{
  const dir = mkdtempSync(join(tmpdir(), 'reuse-up-'));
  try {
    const chain = upwardHandoffDirs(dir);
    assert.equal(chain[0], join(dir, '.ae-cli', 'data-integration'));
    assert.ok(chain.length >= 2);
    assert.ok(new Set(chain).size === chain.length);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// A real same-shape pair: 25_reuse_same_shape.csv carries the same columns and format as
// 01_normal_ecommerce.csv with different rows, so a handoff package built from 01 must match it by
// structure fingerprint. The candidate above fakes this in memory; the fixture proves it end to end
// through inspect + profile, which is the reuse path a same-shape delivery package depends on.
{
  const firstInput = await inspectLocalDataInput(fixture('01_normal_ecommerce.csv'));
  const sameShapeInput = await inspectLocalDataInput(fixture('25_reuse_same_shape.csv'));
  const first = await profileLocalData(firstInput, selectDataSet(firstInput), 'Asia/Shanghai');
  const sameShape = await profileLocalData(sameShapeInput, selectDataSet(sameShapeInput), 'Asia/Shanghai');
  assert.notEqual(sameShapeInput.sha256, firstInput.sha256, 'same shape, different rows');
  assert.equal(
    structureFingerprint(sameShape.recommended_mapping),
    structureFingerprint(first.recommended_mapping),
    "same columns and format produce the same structure fingerprint, so 01's handoff matches 25",
  );
}

process.stdout.write('local data reuse tests: passed\n');
