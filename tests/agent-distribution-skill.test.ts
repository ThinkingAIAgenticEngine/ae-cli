import assert from 'node:assert/strict';
import fs from 'node:fs';
import agentCommands from '../src/commands/te-agent/index.ts';

const read = (file: string) =>
  fs.readFileSync(new URL(`../skills/ae-agent/${file}`, import.meta.url), 'utf8');
const skill = read('SKILL.md');
const reference = read('references/agent-distribution.md');
const index = read('references/command_index.md');
const commands = agentCommands.filter(({ resource }) =>
  ['bundle', 'share', 'submission'].includes(resource ?? ''),
);
assert.equal(commands.length, 7);
assert.match(skill, /CRITICAL[^\n]*agent bundle[^\n]*references\/agent-distribution\.md/);
assert.match(skill, new RegExp(`Tool Groups \\(${agentCommands.length} commands\\)`));
for (const command of commands) {
  const fullName = `ae-cli agent ${command.resource} ${command.command}`;
  assert.ok(reference.includes(fullName), `Missing workflow documentation: ${fullName}`);
  assert.ok(index.includes(fullName), `Missing risk metadata: ${fullName}`);
  assert.equal(
    command.risk,
    ['create', 'accept', 'reject'].includes(command.command) ? 'write' : 'read',
  );
}
for (const required of [
  'Transition status: transitional',
  'Owning module:',
  'Current transport:',
  'Gateway target:',
  'Review after:',
  'Exit condition:',
  'agent.publish@1',
  'data.items[].outcome',
  'immutable',
  'optimistic_version',
  'untrusted data',
  'does not verify',
  'HTTP 403',
  'after rejection',
  '`accepted` or `accepted_reused`',
  '`installed_reused`',
]) {
  assert.ok(reference.includes(required), `Missing workflow safety guidance: ${required}`);
}
assert.doesNotMatch(reference, /accepted_created/);
console.log('agent distribution skill tests passed');
