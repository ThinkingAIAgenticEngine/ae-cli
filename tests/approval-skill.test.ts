import assert from 'node:assert/strict';
import fs from 'node:fs';

import agentCommands from '../src/commands/te-agent/index.ts';

const skill = fs.readFileSync(new URL('../skills/ae-agent/SKILL.md', import.meta.url), 'utf8');
const approvalCommands = agentCommands.filter((command) => command.resource?.startsWith('approval-'));

assert.equal(approvalCommands.length, 13);
assert.match(skill, /^version: 1\.5\.3$/m);
assert.match(skill, /## Generic Approval Workflow \(13\)/);
assert.match(
  skill,
  /CRITICAL[^\n]*hierarchical approval commands[^\n]*`approval-effect\.md`/,
  'the critical approval reference rule must include approval-effect.md',
);
assert.match(
  skill,
  /High-risk write operations[^\n]*`risk: high-risk-write`[^\n]*require explicit user authorization/,
  'high-risk-write guidance must cover more than delete commands',
);
assert.match(
  skill,
  /Within the memory domain[^\n]*high-risk-write[^\n]*delete operations use `--yes`/,
  'memory-specific risk guidance must not redefine the global high-risk-write contract',
);
assert.doesNotMatch(skill, /only `high-risk-write` delete operations use `--yes`/);

const effectReference = fs.readFileSync(
  new URL('../skills/ae-agent/references/approval-effect.md', import.meta.url),
  'utf8',
);
const requestReference = fs.readFileSync(
  new URL('../skills/ae-agent/references/approval-request.md', import.meta.url),
  'utf8',
);
assert.match(
  effectReference,
  /^ae-cli --yes agent approval-effect retry /m,
  'the authorized Effect retry example must pass global --yes',
);
assert.match(requestReference, /`approval_active_request_conflict`/);
assert.doesNotMatch(requestReference, /`approval_active_request_exists`/);
assert.match(effectReference, /`approval_effect_retry_conflict`/);
assert.doesNotMatch(effectReference, /`approval_effect_retry_state_invalid`/);
assert.doesNotMatch(effectReference, /`approval_version_conflict`/);

for (const resource of ['approval-type', 'approval-request', 'approval-task', 'approval-effect']) {
  const reference = fs.readFileSync(
    new URL(`../skills/ae-agent/references/${resource}.md`, import.meta.url),
    'utf8',
  );
  assert.match(skill, new RegExp(`references/${resource}\\.md`));
  assert.match(reference, /Transition status: transitional/);
  assert.match(reference, /Owning module: te-agent approval domain/);
  assert.match(reference, /Current transport: CLI-token-only versioned REST/);
  assert.match(reference, /Gateway target:/);
  assert.match(reference, /Review after: 2026-11-17/);
  assert.match(reference, /Exit condition:/);
}

for (const command of approvalCommands.filter((item) => item.risk !== 'read')) {
  const resource = command.resource!;
  const reference = fs.readFileSync(
    new URL(`../skills/ae-agent/references/${resource}.md`, import.meta.url),
    'utf8',
  );
  assert.match(reference, new RegExp(`approval-${resource.split('-')[1]} ${command.command}`));
  assert.match(reference, /local method, URL, and body preview/);
  assert.match(reference, /does not verify/i);
}

console.log('approval skill tests passed');
