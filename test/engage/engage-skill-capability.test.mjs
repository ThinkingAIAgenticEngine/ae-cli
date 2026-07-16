import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const skill = readFileSync(path.join(ROOT, 'skills/ae-engage/SKILL.md'), 'utf8');
const touchLimitsRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/channel_touch_limits_list.md'),
  'utf8',
);
const versionListRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/version-list.md'),
  'utf8',
);
const operationLogRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/operation-log-query.md'),
  'utf8',
);

const touchLimitsCommand =
  'ae-cli engage-setting channel-touch-limits list --project-id <project_id>';
const versionListCommand =
  'ae-cli engage-flow version list --project-id <project-id> --flow-id <flow-id>';

assert.match(skill, /engage-setting\.channel-touch-limits\.list/);
assert.match(skill, /references\/channel_touch_limits_list\.md/);
assert.match(skill, /references\/operation-log-query\.md/);
assert.match(skill, /references\/version-list\.md/);
assert.match(skill, /references\/segment-list-query\.md/);
assert.match(skill, /references\/group-list\.md/);
assert.match(skill, /references\/ops-delete\.md/);
assert.ok(skill.includes(touchLimitsCommand));
assert.ok(skill.includes('ae-cli engage-flow version list'));
assert.ok(skill.includes('ae-cli engage-flow operation-log query'));
assert.ok(skill.includes('ae-cli engage-task segment-list query'));
assert.ok(skill.includes('ae-cli engage-task group list'));
assert.doesNotMatch(skill, /engage-flow test run|references\/test-run\.md/);
assert.doesNotMatch(skill, /ae-cli capability/);
assert.match(skill, /Temporarily disabled engage-task commands/);
assert.match(
  skill,
  /Temporarily disabled engage-task commands[\s\S]*`group delete`[\s\S]*`segment-list set-visibility`[\s\S]*`ops submit-approval`[\s\S]*`race release`/,
);
assert.doesNotMatch(skill, /`group \*`|`segment-list \*`|`ops \*`/);
assert.doesNotMatch(
  skill,
  /`channel-ref stats` \/ `group list\|create\|update`[\s\S]*`race release` \(via/,
);

assert.match(touchLimitsRef, /^# engage-setting channel-touch-limits list$/m);
assert.match(
  touchLimitsRef,
  /Capability id: `engage-setting\.channel-touch-limits\.list` · Domain: `engage`/,
);
assert.ok(touchLimitsRef.includes(touchLimitsCommand));
assert.ok(touchLimitsRef.includes(`${touchLimitsCommand} --dry-run`));
assert.match(touchLimitsRef, /`--project-id` \/ `-p`/);
assert.doesNotMatch(touchLimitsRef, /ae-cli capability|--input/);
assert.doesNotMatch(touchLimitsRef, /## Request Body|```json/);

assert.match(versionListRef, /^# engage-flow version list$/m);
assert.ok(versionListRef.includes(versionListCommand));
assert.match(versionListRef, /`--project-id`/);
assert.match(versionListRef, /`--flow-id`/);

assert.match(operationLogRef, /engage-flow operation-log query/);

process.stdout.write('engage skill capability contract: OK\n');
