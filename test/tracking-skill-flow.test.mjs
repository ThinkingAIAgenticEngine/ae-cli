import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const skill = readFileSync(path.join(ROOT, 'skills/ae-generate-tracking-plan/SKILL.md'), 'utf8');

function test(name, fn) {
  fn();
  console.log(`  OK: ${name}`);
}

function sectionBetween(startHeading, endHeading) {
  const start = skill.indexOf(startHeading);
  const end = skill.indexOf(endHeading);
  assert.notEqual(start, -1, `${startHeading} not found`);
  assert.notEqual(end, -1, `${endHeading} not found`);
  assert.ok(end > start, `${endHeading} must appear after ${startHeading}`);
  return skill.slice(start, end);
}

console.log('tracking skill flow tests');

test('Phase 0 Item 2 hides codebase in sandbox and renumbers visibly', () => {
  const item2 = sectionBetween(
    '### Item 2 — Source Material + Business Dimension (combined)',
    '### Item 3 — SDK Integration Config (client + server combined)',
  );
  assert.match(item2, /Codebase is a local-material option/);
  assert.match(item2, /must be hidden in sandbox environments/);
  assert.match(item2, /renumber the visible list contiguously from 1/);
  assert.match(item2, /visible list shown to the user/);

  const sandboxStart = item2.indexOf('If in a sandbox environment, ask exactly:');
  const sandboxEnd = item2.indexOf('Do not rewrite this source material list');
  assert.notEqual(sandboxStart, -1, 'sandbox prompt not found');
  assert.notEqual(sandboxEnd, -1, 'sandbox prompt end not found');
  assert.ok(sandboxEnd > sandboxStart, 'sandbox prompt end must appear after start');

  const sandboxPrompt = item2.slice(sandboxStart, sandboxEnd);
  assert.match(sandboxPrompt, /1 - Product document/);
  assert.match(sandboxPrompt, /2 - Detailed description/);
  assert.match(sandboxPrompt, /3 - Pre-built template/);
  assert.match(sandboxPrompt, /1,3/);
  assert.doesNotMatch(sandboxPrompt, /Codebase/);
});

test('Template localization is delegated to src/tracking i18n, not model translation', () => {
  const merge = sectionBetween(
    '### 1.2 Merge Source Materials',
    '### 1.3 Inject Business Dimension Events',
  );
  assert.match(merge, /Do not manually translate template content after import/);
  assert.match(merge, /Use `src\/tracking` i18n/);
  assert.match(merge, /AE_LANG=<user_lang>/);
  assert.doesNotMatch(merge, /must translate after import/i);
  assert.doesNotMatch(merge, /event_tag also needs translation/i);

  const lookup = sectionBetween(
    '### 📁 Template Lookup Convention',
    '## Phase 2 — Refine',
  );
  assert.match(lookup, /must not be model-translated/);
  assert.match(lookup, /Display the template names returned by the CLI/);
  assert.doesNotMatch(lookup, /Display translated template names/);
});

test('Phase 0 Item 3 has an explicit confirmation gate before Item 4', () => {
  const item3 = sectionBetween(
    '### Item 3 — SDK Integration Config (client + server combined)',
    '### Item 4 — User Identity System (visitor ID + account ID combined)',
  );
  assert.match(item3, /Item 3 confirmation gate/);
  assert.match(item3, /Do not display Item 4/);
  assert.match(item3, /explicitly confirms/);
  assert.match(item3, /Confirm this SDK integration config/);
});

test('Phase 4 existing-plan fetch does not force a host override', () => {
  const phase4 = sectionBetween(
    '### 4.1 Check Project\'s Existing Plan',
    '**Result assessment**:',
  );
  assert.match(phase4, /tracking plan fetch --project <projectId> > \.ae-cli\/existing-plan\.json/);
  assert.doesNotMatch(phase4, /tracking plan fetch --project <projectId> --host <host>/);
  assert.match(phase4, /cli-token\.json/);
});

console.log('All tracking skill flow tests passed.');
