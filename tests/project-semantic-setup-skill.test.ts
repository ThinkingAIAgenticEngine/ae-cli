import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const setup = readFileSync(new URL('../skills/ae-analysis/references/project_semantic_setup.md', import.meta.url), 'utf8');

test('project setup uses public create/update capabilities instead of the personal add verb', () => {
  assert.ok(setup.includes('`business_semantics.project_context.create`'));
  assert.ok(setup.includes('`business_semantics.project_context.update`'));
  assert.ok(!/project_context\.add\b/.test(setup));
});

test('saved sources use readable names while detailed evidence stays local', () => {
  const workspace = readFileSync(new URL('../skills/ae-analysis/references/business_semantics_workspace.md', import.meta.url), 'utf8');
  for (const reference of [setup, workspace]) {
    assert.ok(reference.includes('{"name":"business-overview.docx"}'));
    assert.match(reference, /Do not persist.*raw JSON/);
    assert.match(reference, /resource_refs/);
    assert.match(reference, /local/i);
    assert.match(reference, /input_file_id/);
    assert.match(reference, /evidence_id/);
  }
  assert.ok(!workspace.includes('A source descriptor contains `excerpt`'));
});
