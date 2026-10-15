import assert from 'node:assert/strict';
import fs from 'node:fs';
import memoryCommands from '../src/commands/memory/index.ts';

const skill = fs.readFileSync(new URL('../skills/ae-agent/SKILL.md', import.meta.url), 'utf8');
const spec = fs.readFileSync(new URL('../docs/specs/user-memory-cli-plan.md', import.meta.url), 'utf8');
const visible = memoryCommands.filter((command) => !command.hidden);

assert.match(skill, /^version: 2\.0\.0$/m);
assert.match(skill, /\/api\/cli\/memory\/v2/);
assert.match(skill, /AgentSpace\.id/);
assert.match(skill, /never falls back to an account default/i);
assert.match(skill, /latest `--version`/);

for (const command of visible) {
  assert.ok(skill.includes(`\`${command.command}\``), `${command.command} must be documented`);
}
for (const command of memoryCommands.filter((item) => item.hidden)) {
  assert.equal(command.hidden, true);
}

const tableStart = skill.indexOf('## AgentSpace Memory (memory domain)');
const tableEnd = skill.indexOf('## Cross-Command Notes');
const table = skill.slice(tableStart, tableEnd);
const documented = [...table.matchAll(/^\|\s*`(\+[^`]+)`\s*\|\s*(read|write|high-risk-write)\s*\|/gm)]
  .map(([, command, risk]) => ({ command, risk }));
assert.deepEqual(documented, visible.map((command) => ({ command: command.command, risk: command.risk })));

assert.match(spec, /\/api\/cli\/memory\/v2/);
assert.match(spec, /AgentSpace/);
assert.match(spec, /Target resolution/);
assert.doesNotMatch(spec, /\/api\/cli\/memory\/v1/);

assert.match(skill, /project scope.*personal-semantic-preference add\|update/s);
assert.match(skill, /reusable project workflows are `context_type=experience`/);

console.log('memory skill tests passed');
