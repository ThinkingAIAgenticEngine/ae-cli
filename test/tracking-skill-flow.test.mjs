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

test('Phase 0 Item 2 hides local-material options in sandbox and renumbers visibly', () => {
  const item2 = sectionBetween(
    '### Item 2 — Source Material + Business Dimension (combined)',
    '### Item 3 — SDK Integration Config (client + server combined)',
  );
  assert.match(item2, /Product document and Codebase are local-material options/);
  assert.match(item2, /Hide both options in sandbox environments/);
  assert.match(item2, /renumber the visible list contiguously from 1/);
  assert.match(item2, /visible list shown to the user/);

  const sandboxStart = item2.indexOf('If in a sandbox environment, ask exactly:');
  const sandboxEnd = item2.indexOf('Do not rewrite this source material list');
  assert.notEqual(sandboxStart, -1, 'sandbox prompt not found');
  assert.notEqual(sandboxEnd, -1, 'sandbox prompt end not found');
  assert.ok(sandboxEnd > sandboxStart, 'sandbox prompt end must appear after start');

  const sandboxPrompt = item2.slice(sandboxStart, sandboxEnd);
  assert.match(sandboxPrompt, /1 - Detailed description/);
  assert.match(sandboxPrompt, /2 - Pre-built template/);
  assert.match(sandboxPrompt, /1,2/);
  assert.doesNotMatch(sandboxPrompt, /Product document/);
  assert.doesNotMatch(sandboxPrompt, /Codebase/);
  assert.doesNotMatch(sandboxPrompt, /\n3 -/);
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
