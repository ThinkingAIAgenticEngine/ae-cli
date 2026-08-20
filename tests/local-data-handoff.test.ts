import assert from 'node:assert/strict';
import {
  HANDOFF_INDEX_VERSION,
  createHandoffScript,
  structureFingerprint,
  upsertIndexEntry,
} from '../src/commands/data-integration/local-data/handoff.js';
import type {
  HandoffIndex,
  HandoffIndexEntry,
} from '../src/commands/data-integration/local-data/handoff.js';
import type { LocalDataMapping } from '../src/commands/data-integration/local-data/types.js';

const baseMapping: LocalDataMapping = {
  version: 'ae-local-data-mapping/v1',
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

// Structural changes move the fingerprint.
{
  assert.notEqual(structureFingerprint({ ...baseMapping, mode: 'user_set' }), structureFingerprint(baseMapping));
  assert.notEqual(
    structureFingerprint({ ...baseMapping, properties: [{ source: 'price', target: 'price', type: 'number' }] }),
    structureFingerprint(baseMapping),
  );
  assert.notEqual(structureFingerprint({ ...baseMapping, exclude_columns: ['note'] }), structureFingerprint(baseMapping));
  assert.notEqual(
    structureFingerprint({ ...baseMapping, properties: baseMapping.properties.map((property) =>
      property.source === 'note' ? { ...property, type: 'number' } : property) }),
    structureFingerprint(baseMapping),
  );
  assert.notEqual(structureFingerprint({ ...baseMapping, event_name_field: 'event' }), structureFingerprint(baseMapping));
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

process.stdout.write('local data handoff tests: passed\n');
