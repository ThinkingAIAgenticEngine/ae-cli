import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import {
  HANDOFF_INDEX_VERSION,
  createHandoffScript,
  stageScopedPackage,
  structureFingerprint,
  upsertIndexEntry,
} from '../src/commands/data-integration/handoff.js';
import type {
  HandoffIndex,
  HandoffIndexEntry,
} from '../src/commands/data-integration/handoff.js';
import {
  PIPELINE_VERSION,
  buildPipelineDescriptor,
  buildShapeBaseline,
  generateBinScripts,
  generateEnvTemplate,
  generateGitignore,
  generateReadme,
  generateRunbook,
} from '../src/commands/data-integration/relay.js';
import { zipPackage } from '../src/commands/data-integration/archive.js';
import type { LocalDataMapping } from '../src/commands/data-integration/types.js';

const baseMapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: 'a'.repeat(64), format: 'csv', data_set: '$' },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user_id',
  default_event_name: 'purchase',
  time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [
    { source: 'amount', target: 'amount', type: 'number' },
    { source: 'note', target: 'note', type: 'string' },
  ],
};

const entry = (fingerprint: string, created_at: string): HandoffIndexEntry => ({
  fingerprint,
  created_at,
  source_sha256: 'b'.repeat(64),
  format: 'csv',
  data_set: '$',
  mode: 'track',
  property_count: 2,
  mapping_file: `${fingerprint.slice(0, 16)}/mapping.json`,
});

// Fingerprint is a deterministic 64-hex digest.
{
  assert.match(structureFingerprint(baseMapping), /^[a-f0-9]{64}$/);
  assert.equal(structureFingerprint(baseMapping), structureFingerprint({ ...baseMapping }));
}

// Column order does not matter (the canonical columns are sorted).
{
  const reordered: LocalDataMapping = {
    ...baseMapping,
    properties: [baseMapping.properties[1], baseMapping.properties[0]],
  };
  assert.equal(structureFingerprint(reordered), structureFingerprint(baseMapping));
}

// Business logic (value_mapping, transforms, default_event_name) does not change the structure fingerprint.
{
  const enriched: LocalDataMapping = {
    ...baseMapping,
    default_event_name: 'order_paid',
    value_mapping: { event_name: { buy: 'purchase' } },
    properties: baseMapping.properties.map((property) => ({ ...property, value_mapping: { x: 'y' } })),
  };
  assert.equal(structureFingerprint(enriched), structureFingerprint(baseMapping));
}

// Structural changes move the fingerprint: the event model, the format, and the column set.
{
  assert.notEqual(structureFingerprint({ ...baseMapping, mode: 'user_set' }), structureFingerprint(baseMapping));
  assert.notEqual(
    structureFingerprint({ ...baseMapping, source: { ...baseMapping.source, format: 'jsonl' } }),
    structureFingerprint(baseMapping),
  );
  assert.notEqual(
    structureFingerprint({ ...baseMapping, properties: [{ source: 'price', target: 'price', type: 'number' }] }),
    structureFingerprint(baseMapping),
  );
}

// Transform decisions — excluding a column, changing a property's type, flattening a
// nested column, or re-assigning a column between #account_id and #distinct_id — change
// how the table is mapped, not which columns the table has, so the fingerprint (keyed on
// the raw source columns) is unchanged.
{
  assert.equal(structureFingerprint({ ...baseMapping, exclude_columns: ['note'] }), structureFingerprint(baseMapping));
  assert.equal(
    structureFingerprint({ ...baseMapping, properties: baseMapping.properties.map((property) =>
      property.source === 'note' ? { ...property, type: 'number' } : property) }),
    structureFingerprint(baseMapping),
  );

  // `user_id` as #account_id vs #distinct_id is the same identity column — same shape.
  assert.equal(
    structureFingerprint({ ...baseMapping, account_id_field: undefined, distinct_id_field: 'user_id' }),
    structureFingerprint(baseMapping),
  );

  // A flatten rule rewrites a raw column (`user_meta`, an object cell) into a derived
  // property (`user_meta_level`) and excludes the raw column. The frozen (flattened)
  // mapping and inspect's raw recommended mapping describe the same table, so they
  // must share one fingerprint.
  const rawRecommended: LocalDataMapping = {
    ...baseMapping,
    properties: [...baseMapping.properties, { source: 'user_meta', target: 'user_meta', type: 'object' }],
  };
  const flattened: LocalDataMapping = {
    ...baseMapping,
    flatten_rules: { user_meta_level: 'user_meta.level' },
    exclude_columns: ['user_meta'],
    properties: [
      ...baseMapping.properties,
      { source: 'user_meta_level', target: 'user_meta_level', type: 'string' },
    ],
  };
  assert.equal(structureFingerprint(flattened), structureFingerprint(rawRecommended));
}

// Index upsert appends new entries and replaces an existing fingerprint.
{
  const entryA = entry('a'.repeat(64), '2026-08-19T00:00:00.000Z');
  const entryB = entry('c'.repeat(64), '2026-08-19T00:00:00.000Z');
  let index: HandoffIndex = { version: HANDOFF_INDEX_VERSION, entries: [entryA] };
  index = upsertIndexEntry(index, entryB);
  assert.equal(index.entries.length, 2);
  index = upsertIndexEntry(index, { ...entryA, created_at: '2026-08-19T01:00:00.000Z' });
  assert.equal(index.entries.length, 2);
  assert.equal(index.entries.find((item) => item.fingerprint === entryA.fingerprint)!.created_at, '2026-08-19T01:00:00.000Z');
}

// The transform wrapper re-stamps the content fingerprint per file instead of
// reusing the frozen one, so a same-shape file passes convert's content guard.
{
  const script = createHandoffScript();
  assert.match(script, /mapping\.source\.sha256 = await sha256Of\(inputFile\)/);
  assert.match(script, /--mapping', JSON\.stringify\(mapping\)/);
}

// Pipeline descriptor: the runtime view of the package.
{
  const fingerprint = structureFingerprint(baseMapping);
  const entries: HandoffIndexEntry[] = [entry(fingerprint, '2026-08-19T00:00:00.000Z')];
  const descriptor = buildPipelineDescriptor(entries);
  assert.equal(descriptor.version, PIPELINE_VERSION);
  assert.equal(descriptor.source.type, 'local_file');
  assert.equal(descriptor.source.params.format, 'csv');
  assert.equal(descriptor.transform.type, 'ae-data-integration-mapping/v1');
  assert.deepEqual(descriptor.transform.refs, [`${fingerprint.slice(0, 16)}/mapping.json`]);
  assert.equal(descriptor.sink.type, 'restful_sync_json');
  assert.equal(descriptor.sink.params.batch_size, 500);
  assert.equal(descriptor.sink.params.env_file, '.local/target.env');

  // The recorded destination (pushurl / project_id) is captured verbatim when
  // the handoff was given those flags; older packages stay env-driven when absent.
  assert.equal(descriptor.sink.params.pushurl, undefined);
  assert.equal(descriptor.sink.params.project_id, undefined);
  const targeted = buildPipelineDescriptor(entries, {
    pushurl: 'https://receiver.example.com',
    project_id: '42',
  });
  assert.equal(targeted.sink.params.pushurl, 'https://receiver.example.com');
  assert.equal(targeted.sink.params.project_id, '42');
}

// Shape baseline: sorted source columns consumed by the mapping.
{
  const fingerprint = structureFingerprint(baseMapping);
  const baseline = buildShapeBaseline([{ mapping: baseMapping, fingerprint }]);
  assert.equal(baseline.version, 'ae-data-integration-shape/v1');
  assert.equal(baseline.entries.length, 1);
  assert.deepEqual(baseline.entries[0].columns, ['amount', 'note', 'time', 'user_id']);
}

// Shape baseline with flatten_rules: the derived out-column never appears, and the
// raw source column each rule reads from does. A CSV flatten of a JSON cell must
// baseline the cell column (`user_meta`), not the materialized out column.
{
  const flattenMapping: LocalDataMapping = {
    ...baseMapping,
    flatten_rules: { user_meta_level: 'user_meta.level' },
    exclude_columns: ['user_meta'],
    properties: [
      ...baseMapping.properties,
      { source: 'user_meta_level', target: 'user_meta_level', type: 'string' },
    ],
  };
  const baseline = buildShapeBaseline([{ mapping: flattenMapping, fingerprint: structureFingerprint(flattenMapping) }]);
  assert.deepEqual(baseline.entries[0].columns, ['amount', 'note', 'time', 'user_id', 'user_meta']);
}

// NDJSON flatten baselines the record-root key (`user_info`), not the flattened leaves.
{
  const ndjsonFlattenMapping: LocalDataMapping = {
    ...baseMapping,
    source: { ...baseMapping.source, format: 'jsonl' },
    flatten_rules: { user_name: 'user_info.name', user_level: 'user_info.level' },
    properties: [
      ...baseMapping.properties,
      { source: 'user_name', target: 'user_name', type: 'string' },
      { source: 'user_level', target: 'user_level', type: 'string' },
    ],
  };
  const baseline = buildShapeBaseline([{ mapping: ndjsonFlattenMapping, fingerprint: structureFingerprint(ndjsonFlattenMapping) }]);
  assert.deepEqual(baseline.entries[0].columns, ['amount', 'note', 'time', 'user_id', 'user_info']);
}

// Generic bin scripts: seven executors that dispatch on pipeline type, never --yes.
{
  const scripts = generateBinScripts();
  assert.equal(scripts.length, 7);
  const byName = Object.fromEntries(scripts.map((file) => [file.relPath, file.content]));
  assert.match(byName['bin/run.sh'], /local_file/);
  assert.match(byName['bin/run.sh'], /unsupported source type/);
  assert.match(byName['bin/run.sh'], /data-integration convert/);
  assert.match(byName['bin/run.sh'], /bound\//);
  // run.sh hints a salvage path when the quarantine is non-empty; it never re-uploads.
  assert.match(byName['bin/run.sh'], /--salvage-from/);
  assert.match(byName['bin/run.sh'], /invalid\.rows\.jsonl/);
  assert.match(byName['bin/upload.sh'], /restful_sync_json/);
  assert.match(byName['bin/upload.sh'], /--confirm/);
  assert.match(byName['bin/upload.sh'], /--dry-run/);
  // upload.sh resolves the recorded target: pushurl (+ /sync_json), project_id, and
  // APPID derivation via project info get, with .local/target.env as the override.
  assert.match(byName['bin/upload.sh'], /pushurl/);
  assert.match(byName['bin/upload.sh'], /project_id/);
  assert.match(byName['bin/upload.sh'], /resolve_appid\.py/);
  assert.match(byName['bin/upload.sh'], /\/sync_json/);
  // The APPID is masked in every echoed command line — never leaked into logs.
  assert.match(byName['bin/upload.sh'], /mask\(\)/);
  assert.match(byName['bin/upload.sh'], /display_args/);
  assert.match(byName['bin/upload.sh'], /display_args "\$\{args\[@\]\}"/);
  assert.match(byName['bin/bind_mapping.py'], /data-integration inspect/);
  assert.match(byName['bin/bind_mapping.py'], /parsed\.get\("data"\)/);
  // bind_mapping.py rebinds only the current pipeline's refs, not the whole
  // cumulative index — stale entries from earlier handoffs must not fail the gate.
  assert.match(byName['bin/bind_mapping.py'], /pipeline\["transform"\]\["refs"\]/);
  assert.doesNotMatch(byName['bin/bind_mapping.py'], /for entry in index\["entries"\]:/);
  assert.match(byName['bin/plan_check.py'], /record\.get\("properties"\)/);
  assert.match(byName['bin/plan_check.py'], /sys\.exit\(3\)/);
  // The plan gate must consult all three property pools; common_event_properties
  // (super properties attached to every event) is a first-class plan field.
  assert.match(byName['bin/plan_check.py'], /common_event_properties/);
  // verify.py is a soft check: it runs the standard ingest summary, never SQL, and
  // points to the project custom layer for a hard per-event judge.
  assert.match(byName['bin/verify.py'], /tracking ingest summary/);
  assert.match(byName['bin/verify.py'], /--baseline/);
  assert.match(byName['bin/verify.py'], /--check/);
  assert.match(byName['bin/verify.py'], /summary changed/);
  assert.match(byName['bin/verify.py'], /custom-layer\.md/);
  assert.doesNotMatch(byName['bin/verify.py'], /adhoc\.run/);
  // resolve_appid.py reads the exact data.appid field from project info get
  // (verified against the AE demo host) and falls back to AE_APPID, never a
  // fuzzy key search.
  assert.match(byName['bin/resolve_appid.py'], /project info get/);
  assert.match(byName['bin/resolve_appid.py'], /\.get\("appid"\)|data\.appid/);
  assert.match(byName['bin/resolve_appid.py'], /AE_APPID/);
  assert.doesNotMatch(byName['bin/resolve_appid.py'], /find_appids|appId|app_key/);
  for (const file of scripts) {
    assert.doesNotMatch(file.content, /--yes/);
    assert.equal(file.mode, 0o700);
  }
}

// Docs and templates are English and carry no --yes.
{
  for (const doc of [generateReadme(), generateRunbook(), generateEnvTemplate(), generateGitignore()]) {
    assert.doesNotMatch(doc, /--yes/);
    assert.doesNotMatch(doc, /[一-鿿]/);
  }
  assert.match(generateReadme(), /pipeline\.json/);
  assert.match(generateReadme(), /pushurl/);
  assert.match(generateReadme(), /resolve_appid\.py/);
  assert.match(generateRunbook(), /Tracking-plan gate/);
  assert.match(generateRunbook(), /ingest summary/);
  assert.match(generateRunbook(), /pushurl/);
  assert.match(generateRunbook(), /verify\.py/);
  assert.match(generateRunbook(), /custom-layer\.md/);
  assert.match(generateEnvTemplate(), /AE_ENDPOINT/);
  assert.match(generateGitignore(), /\.local\/target\.env/);
}

// Zip keeps the package tree, skips .DS_Store, and preserves executable bits.
{
  const dir = mkdtempSync(join(tmpdir(), 'handoff-zip-'));
  try {
    mkdirSync(join(dir, 'bin'), { recursive: true });
    writeFileSync(join(dir, 'index.json'), '{"version":"ae-data-integration-index/v1"}');
    writeFileSync(join(dir, '.DS_Store'), 'junk');
    writeFileSync(join(dir, 'bin', 'run.sh'), '#!/usr/bin/env bash\necho hi\n', { mode: 0o700 });
    const zipPath = join(dir, 'pkg.zip');
    await zipPackage(dir, zipPath);
    const zip = await JSZip.loadAsync(await readFile(zipPath));
    const names = Object.keys(zip.files);
    assert.ok(names.includes('index.json'));
    assert.ok(names.includes('bin/run.sh'));
    assert.ok(!names.some((name) => name.includes('.DS_Store')));
    assert.equal((zip.file('bin/run.sh')!.unixPermissions ?? 0) & 0o777, 0o700);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// The zipped package is this round only: a scoped index plus this round's
// mapping dirs, never the accumulated history kept in the package directory.
{
  const dir = mkdtempSync(join(tmpdir(), 'handoff-scope-'));
  try {
    const roundA = 'a'.repeat(64);
    const roundB = 'b'.repeat(64);
    // Historical round A plus this round's (B) frozen files on disk.
    mkdirSync(join(dir, roundA.slice(0, 16)), { recursive: true });
    writeFileSync(join(dir, roundA.slice(0, 16), 'mapping.json'), '{}');
    mkdirSync(join(dir, roundB.slice(0, 16)), { recursive: true });
    writeFileSync(join(dir, roundB.slice(0, 16), 'mapping.json'), '{}');
    writeFileSync(join(dir, roundB.slice(0, 16), 'transform.mjs'), '');
    writeFileSync(join(dir, roundB.slice(0, 16), 'plan.json'), '{}');

    const entries: HandoffIndexEntry[] = [
      {
        ...entry(roundB, '2026-08-25T00:00:00.000Z'),
        plan_file: `${roundB.slice(0, 16)}/plan.json`,
      },
    ];
    const staging = stageScopedPackage(
      dir,
      [{ dirName: roundB.slice(0, 16), planFile: `${roundB.slice(0, 16)}/plan.json` }],
      entries,
      generateBinScripts(),
    );

    const index = JSON.parse(readFileSync(join(staging, 'index.json'), 'utf8'));
    assert.equal(index.entries.length, 1);
    assert.equal(index.entries[0].fingerprint, roundB);
    assert.ok(existsSync(join(staging, roundB.slice(0, 16), 'mapping.json')));
    assert.ok(existsSync(join(staging, roundB.slice(0, 16), 'transform.mjs')));
    assert.ok(existsSync(join(staging, roundB.slice(0, 16), 'plan.json')));
    assert.ok(!existsSync(join(staging, roundA.slice(0, 16))));
    assert.ok(existsSync(join(staging, 'bin', 'run.sh')));

    rmSync(staging, { recursive: true, force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

process.stdout.write('local data handoff tests: passed\n');
