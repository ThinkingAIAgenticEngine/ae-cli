import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const skill = readFileSync(
  new URL('../skills/ae-project-semantic/SKILL.md', import.meta.url),
  'utf8',
);
const quality = readFileSync(
  new URL('../skills/ae-project-semantic/references/recommendation-quality.md', import.meta.url),
  'utf8',
);
const routing = readFileSync(
  new URL('../skills/ae-project-semantic/references/query-routing-v5.md', import.meta.url),
  'utf8',
);

assert.doesNotMatch(skill, /^version:/m);
assert.match(skill, /`topic_group_key`/);
assert.match(skill, /references\/query-routing-v5\.md/);
assert.match(skill, /`QUERY_ROUTING`/);
assert.match(skill, /`RECALL_SHORTCUT`/);
assert.match(skill, /`ANALYSIS_PLAYBOOK`/);
assert.match(skill, /formula, threshold, state, event, property, report, or asset name/);
assert.match(skill, /decision ledger/i);
assert.match(skill, /catalog\/disabled\.jsonl/);
assert.match(skill, /Disabled semantics are suppression context/);
assert.match(skill, /project-semantic candidate enable/);
assert.match(skill, /project-semantic delete-impact/);

assert.match(quality, /\[`query-routing-v5\.md`\]\(query-routing-v5\.md\)/);
assert.match(quality, /standalone formula or state descriptions/);
assert.match(quality, /broad topic summary with no asset-choice branch/);

for (const heading of [
  '## QUERY_ROUTING gate',
  '## RECALL_SHORTCUT gate',
  '## ANALYSIS_PLAYBOOK gate',
  '## Reject shallow candidates',
  '## Decision ledger',
  '## Acceptance',
  '## Anti-overfitting',
]) {
  assert.match(routing, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbidden of [
  '产品雷达',
  'Tiki-Boom',
  'project_id=5',
  'project_id=6',
  'expected candidate count',
]) {
  assert.doesNotMatch(routing, new RegExp(forbidden));
}

console.log('project semantic skill tests passed');
