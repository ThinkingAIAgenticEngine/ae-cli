// Deterministic self-check for the semantic extraction used by the E2E canary diff.
//
// The canary diff (`e2e/diff.mjs`) compares a live agent's migrated code against
// golden by *extracting semantics* (event names, identity/user-property calls,
// `@tracking` markers) via `signatures.mjs`. If those extraction regexes silently
// stop matching a shape (e.g. the Java 3rd-positional `track` or the React Native
// `eventName` object form), the canary would report "no differences" while actually
// comparing nothing — a false green. This test closes that hole without agent cost:
// it asserts, for every golden platform, that the extraction recovers exactly the
// events and calls declared in that platform's own `mapping.json`.
//
// Run: npm run verify:skill-migration

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migratedSignatures, readAllFiles } from './signatures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(__dirname, 'golden');

// mapping.json `ae_call` (snake_case) → migrated-code method name (camelCase).
const CALL_NAME = {
  login: 'login', // identity entries carry ae_call: "login(accountId)"
  user_set: 'userSet',
  user_setOnce: 'userSetOnce',
  user_add: 'userAdd',
  user_append: 'userAppend',
  user_unset: 'userUnset',
  set_super_properties: 'setSuperProperties',
};

function multiset(arr) {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return m;
}

function assertSameMultiset(actual, expected, label) {
  const a = multiset(actual);
  const e = multiset(expected);
  assert.deepEqual(Object.fromEntries(a), Object.fromEntries(e), label);
}

async function loadJson(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

async function listDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

const platforms = [];
for (const provider of await listDirs(GOLDEN)) {
  for (const platform of await listDirs(path.join(GOLDEN, provider))) {
    platforms.push(`${provider}/${platform}`);
  }
}

for (const platform of platforms) {
  test(`migrated extraction ${platform}: markers/tracks/calls match mapping.json`, async () => {
    const root = path.join(GOLDEN, platform);
    const mapping = await loadJson(path.join(root, 'mapping.json'));
    const code = await readAllFiles(path.join(root, 'migrated'));
    const sig = migratedSignatures(code);

    const events = [];
    const calls = [];
    for (const entry of mapping.entries ?? []) {
      if (entry.ae_event) events.push(entry.ae_event);
      if (entry.ae_call) {
        const name = entry.ae_call === 'login(accountId)' ? 'login' : entry.ae_call;
        assert.ok(CALL_NAME[name], `mapping ${platform}: unknown ae_call "${entry.ae_call}"`);
        calls.push(CALL_NAME[name]);
      }
    }

    const markers = sig.markers.map((s) => s.slice('marker:'.length));
    const tracks = sig.tracks.map((s) => s.slice('track:'.length));
    const methods = sig.calls.map((s) => s.slice('call:'.length));

    assertSameMultiset(markers, events, `${platform}: @tracking markers vs mapping ae_event`);
    assertSameMultiset(tracks, events, `${platform}: track() events vs mapping ae_event`);
    assertSameMultiset(methods, calls, `${platform}: identity/user-prop calls vs mapping ae_call`);
  });
}
