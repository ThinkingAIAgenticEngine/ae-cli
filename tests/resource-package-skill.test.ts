import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const skill = readFileSync(new URL('../skills/ae-agent/SKILL.md', import.meta.url), 'utf8');
const reference = readFileSync(new URL('../skills/ae-agent/references/resource-package.md', import.meta.url), 'utf8');
const index = readFileSync(new URL('../skills/ae-agent/references/command_index.md', import.meta.url), 'utf8');

for (const action of ['list', 'show', 'export-preview', 'export', 'import', 'download', 'cancel', 'retry']) {
  assert.match(skill, new RegExp(`resource-package ${action}`));
  assert.match(index, new RegExp(`resource-package ${action}`));
}
assert.match(reference, /Transition status: transitional/);
assert.match(reference, /Current transport: CLI-token REST/);
assert.match(reference, /--accept-warnings/);
assert.match(reference, /--allow-duplicate/);
assert.match(reference, /\.part\.json/);
assert.match(reference, /SHA-256/);
process.stdout.write('resource package skill tests passed\n');
