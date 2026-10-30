import assert from 'node:assert/strict';
import fs from 'node:fs';
import workspaceCommands from '../src/commands/workspace/index.ts';

const skill = fs.readFileSync(new URL('../skills/ae-workspace/SKILL.md', import.meta.url), 'utf8');
const reference = fs.readFileSync(new URL('../skills/ae-workspace/references/commands.md', import.meta.url), 'utf8');
const spec = fs.readFileSync(new URL('../docs/specs/agent-space-workspace-cli.md', import.meta.url), 'utf8');

assert.match(skill, /^name: ae-workspace$/m);
assert.match(skill, /^version: 1\.1\.0$/m);
assert.match(skill, /AgentSpace\.id/);
assert.match(skill, /Never fall back to an account default/);
assert.match(skill, /Transition status: transitional/);
assert.match(skill, /Current transport: CLI-token REST under `\/api\/cli\/workspace\/v1`/);
assert.match(skill, /Gateway target: TBD/);

for (const command of workspaceCommands) {
  const path = [command.resource, command.command].filter(Boolean).join(' ');
  assert.ok(reference.includes(`\`${path}\``), `${path} must be documented`);
}
assert.match(reference, /Uploads are capped at 50 MB/);
assert.match(reference, /refuse to replace an existing local file/);
assert.match(reference, /Ownership transfer is a distinct command/);
assert.match(spec, /implemented across the paired ae-cli and te-claude changes/);
assert.match(spec, /There is no implicit default-personal-space fallback/);
assert.match(spec, /Gateway target metadata is not yet available/);

console.log('workspace skill tests passed');
