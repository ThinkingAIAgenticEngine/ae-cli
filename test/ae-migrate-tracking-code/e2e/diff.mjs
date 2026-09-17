#!/usr/bin/env node
// Semantic diff between an E2E canary run's output and the golden artifacts.
//
// The canary is a live agent run of the ae-migrate-tracking-code skill, so its output is
// NOT expected to be byte-identical to golden — only semantically equivalent. This script
// compares the semantic content (event names, property names, call kinds, modes) and
// ignores surface differences (call-site ids, line numbers, display_name wording, code
// formatting/comments).
//
// Usage:
//   node test/ae-migrate-tracking-code/e2e/diff.mjs                  # all platforms under e2e/output/
//   node test/ae-migrate-tracking-code/e2e/diff.mjs firebase/web-v9   # one platform
//
// Exit codes: 0 = all compared platforms match, 1 = differences found, 2 = nothing to compare.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migratedSignatures, readAllFiles } from '../signatures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUITE = path.resolve(__dirname, '..');
const GOLDEN = path.join(SUITE, 'golden');
const OUTPUT = path.join(__dirname, 'output');

function multiset(arr) {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return m;
}

function diffSets(name, got, want, report) {
  const g = multiset(got);
  const w = multiset(want);
  for (const k of new Set([...g.keys(), ...w.keys()])) {
    const gd = g.get(k) || 0;
    const wd = w.get(k) || 0;
    if (gd !== wd) report.push(`${name}: "${k}" (output=${gd}, golden=${wd})`);
  }
}

function scanSignature(cs) {
  if (cs.kind === 'event') {
    const keys = Object.keys(cs.params ?? {}).sort().join(',');
    return `event:${cs.event_name}|props[${keys}]|resolved=${cs.resolved}`;
  }
  if (cs.kind === 'identity') return 'identity';
  if (cs.kind === 'user_property') return `user_property:${cs.op}:${cs.prop}`;
  return `unknown:${cs.kind}`;
}

function mappingSignature(e) {
  if (e.ae_event) {
    const keys = Object.keys(e.ae_props ?? {}).sort().join(',');
    return `event:${e.ae_event}|props[${keys}]|action=${e.action}`;
  }
  if (e.ae_call) {
    const keys = Object.keys(e.ae_props ?? {}).sort().join(',');
    return `call:${e.ae_call}|props[${keys}]`;
  }
  return 'unknown';
}

function eventSignature(evt) {
  const keys = (evt.prop_names ?? []).slice().sort().join(',');
  return `event:${evt.event_name}|props[${keys}]`;
}

function propSignature(p) {
  return `${p.type}:${p.name}`;
}

async function loadJson(p) {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return null;
  }
}

async function diffPlatform(platform) {
  const outDir = path.join(OUTPUT, platform);
  const goldDir = path.join(GOLDEN, platform);
  const report = [];

  const goldScan = await loadJson(path.join(goldDir, 'scan.json'));
  if (!goldScan) return { platform, report: [`golden ${platform}/scan.json missing`] };

  const outScan = await loadJson(path.join(outDir, 'scan.json'));
  if (!outScan) return { platform, report: [`canary output ${platform}/scan.json missing`] };

  const outMapping = await loadJson(path.join(outDir, 'mapping.json'));
  const goldMapping = await loadJson(path.join(goldDir, 'mapping.json'));
  const outDraft = await loadJson(path.join(outDir, 'draft.json'));
  const goldDraft = await loadJson(path.join(goldDir, 'draft.json'));

  // scan: provider/variant + call-site signatures.
  if (outScan.provider !== goldScan.provider) report.push(`scan.provider: "${outScan.provider}" != "${goldScan.provider}"`);
  if (outScan.variant !== goldScan.variant) report.push(`scan.variant: "${outScan.variant}" != "${goldScan.variant}"`);
  diffSets(
    'scan.call_sites',
    (outScan.call_sites ?? []).map(scanSignature),
    (goldScan.call_sites ?? []).map(scanSignature),
    report,
  );

  // mapping: mode + entry signatures.
  if (outMapping && goldMapping) {
    if (outMapping.mode !== goldMapping.mode) report.push(`mapping.mode: "${outMapping.mode}" != "${goldMapping.mode}"`);
    diffSets(
      'mapping.entries',
      (outMapping.entries ?? []).map(mappingSignature),
      (goldMapping.entries ?? []).map(mappingSignature),
      report,
    );
  } else if (!outMapping) {
    report.push(`canary output ${platform}/mapping.json missing`);
  }

  // draft: events + property pools.
  if (outDraft && goldDraft) {
    diffSets('draft.events', (outDraft.events ?? []).map(eventSignature), (goldDraft.events ?? []).map(eventSignature), report);
    diffSets('draft.event_properties', (outDraft.event_properties ?? []).map(propSignature), (goldDraft.event_properties ?? []).map(propSignature), report);
    diffSets('draft.user_properties', (outDraft.user_properties ?? []).map(propSignature), (goldDraft.user_properties ?? []).map(propSignature), report);
    diffSets('draft.common_event_properties', (outDraft.common_event_properties ?? []).map(propSignature), (goldDraft.common_event_properties ?? []).map(propSignature), report);
  } else if (!outDraft) {
    report.push(`canary output ${platform}/draft.json missing`);
  }

  // migrated code: ta.* calls + @tracking markers (concatenated across files).
  let outCode = '';
  let goldCode = '';
  try {
    outCode = await readAllFiles(path.join(outDir, 'migrated'));
  } catch {
    report.push(`canary output ${platform}/migrated/ missing`);
  }
  try {
    goldCode = await readAllFiles(path.join(goldDir, 'migrated'));
  } catch {
    report.push(`golden ${platform}/migrated/ missing`);
  }
  if (outCode && goldCode) {
    const o = migratedSignatures(outCode);
    const g = migratedSignatures(goldCode);
    diffSets('migrated tracks', o.tracks, g.tracks, report);
    diffSets('migrated @tracking markers', o.markers, g.markers, report);
    diffSets('migrated identity/user-prop calls', o.calls, g.calls, report);
  }

  return { platform, report };
}

async function main() {
  const args = process.argv.slice(2);
  let platforms = args.map((a) => a.replace(/\/+$/, ''));
  if (platforms.length === 0) {
    platforms = [];
    try {
      for (const provider of await readdir(OUTPUT)) {
        for (const platform of await readdir(path.join(OUTPUT, provider))) {
          platforms.push(`${provider}/${platform}`);
        }
      }
    } catch {
      // no output dir
    }
  }
  if (platforms.length === 0) {
    console.error('No canary output found under e2e/output/ — run the PROMPT.md canary first.');
    process.exit(2);
  }

  let failed = false;
  for (const platform of platforms) {
    const { report } = await diffPlatform(platform);
    if (report.length === 0) {
      console.log(`✔ ${platform}: semantic match`);
    } else {
      failed = true;
      console.log(`✖ ${platform}: ${report.length} difference(s)`);
      for (const r of report) console.log(`    - ${r}`);
    }
  }
  if (failed) {
    console.log('\nDifferences found. Fix the skill instructions (or golden, with a reason) and re-run.');
  }
  process.exit(failed ? 1 : 0);
}

main();
