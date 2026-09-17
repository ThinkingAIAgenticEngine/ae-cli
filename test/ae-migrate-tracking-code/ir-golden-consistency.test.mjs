// Consistency check between the ir.md schema examples and the golden artifacts.
//
// The golden scan.json / mapping.json files are the executable contract: they are
// asserted by migration-regression.test.mjs and their draft.json must pass the real
// `ae-cli tracking plan` CLI. The ir.md examples are documentation. If the two drift —
// as they once did (variant "v9-modular" vs "web-v9", identity `resolved:false` vs
// `true`, user_property missing `prop`/`value`) — nothing else in the suite notices,
// because no other test reads both. This file pins them together.
//
// Run: npm run verify:skill-migration

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const GOLDEN = path.join(__dirname, 'golden');
const IR_MD = path.join(ROOT, 'skills', 'ae-migrate-tracking-code', 'references', 'ir.md');

// user_property `op` maps to AE user_set / user_setOnce / user_add (ir.md + VALID_UPDATE_TYPES).
const KNOWN_USER_PROP_OPS = new Set(['set', 'setOnce', 'add']);

async function collectJson(dir, filename) {
  const out = [];
  const walk = async (d) => {
    for (const ent of await readdir(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) await walk(p);
      else if (ent.name === filename) out.push(p);
    }
  };
  await walk(dir);
  return out;
}

function parseIrExamples(md) {
  const blocks = [...md.matchAll(/```json\s*\n([\s\S]*?)```/g)]
    .map((m) => {
      try { return JSON.parse(m[1]); } catch { return null; }
    })
    .filter(Boolean);
  const scanExample = blocks.find((b) => b.call_sites);
  const mappingExample = blocks.find((b) => b.entries);
  assert.ok(scanExample, 'ir.md must contain a parseable scan.json example (call_sites)');
  assert.ok(mappingExample, 'ir.md must contain a parseable mapping.json example (entries)');
  return { scanExample, mappingExample };
}

test('ir.md examples agree with golden scan/mapping conventions', async () => {
  const md = await readFile(IR_MD, 'utf8');
  const { scanExample, mappingExample } = parseIrExamples(md);

  const scanFiles = await collectJson(GOLDEN, 'scan.json');
  const mappingFiles = await collectJson(GOLDEN, 'mapping.json');

  // 1. variant label: examples must use a variant that actually exists in golden.
  const goldenVariants = new Set();
  for (const f of [...scanFiles, ...mappingFiles]) {
    const j = JSON.parse(await readFile(f, 'utf8'));
    goldenVariants.add(j.variant);
  }
  assert.ok(goldenVariants.has(scanExample.variant),
    `ir.md scan example variant "${scanExample.variant}" is not used by any golden artifact`);
  assert.ok(goldenVariants.has(mappingExample.variant),
    `ir.md mapping example variant "${mappingExample.variant}" is not used by any golden artifact`);

  // 2. identity `resolved`: goldens are uniform; the example must match them.
  const exampleIdentity = scanExample.call_sites.find((c) => c.kind === 'identity');
  assert.ok(exampleIdentity, 'ir.md scan example must include an identity call site');
  const goldenIdentityResolved = new Set();
  for (const f of scanFiles) {
    const j = JSON.parse(await readFile(f, 'utf8'));
    for (const c of j.call_sites) if (c.kind === 'identity') goldenIdentityResolved.add(c.resolved);
  }
  assert.equal(goldenIdentityResolved.size, 1, 'golden identity `resolved` values must be uniform');
  assert.equal(exampleIdentity.resolved, [...goldenIdentityResolved][0],
    'ir.md identity example `resolved` must match the golden value');

  // 3. user_property shape: example and goldens both carry prop + value, and op stays known.
  const exampleUserProp = scanExample.call_sites.find((c) => c.kind === 'user_property');
  assert.ok(exampleUserProp, 'ir.md scan example must include a user_property call site');
  assert.ok('prop' in exampleUserProp && 'value' in exampleUserProp,
    'ir.md user_property example must carry `prop` and `value` fields');
  assert.ok(KNOWN_USER_PROP_OPS.has(exampleUserProp.op),
    `ir.md user_property example op "${exampleUserProp.op}" is not a known op (set|setOnce|add)`);
  for (const f of scanFiles) {
    const j = JSON.parse(await readFile(f, 'utf8'));
    for (const c of j.call_sites) {
      if (c.kind !== 'user_property') continue;
      assert.ok('prop' in c && 'value' in c, `golden user_property missing prop/value in ${f}`);
      assert.ok(KNOWN_USER_PROP_OPS.has(c.op), `unknown user_property op "${c.op}" in ${f}`);
    }
  }
});
