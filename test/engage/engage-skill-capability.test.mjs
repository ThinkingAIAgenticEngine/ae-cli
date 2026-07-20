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
assert.match(skill, /references\/task-delete\.md/);
assert.ok(skill.includes(touchLimitsCommand));
assert.ok(skill.includes('ae-cli engage-flow version list'));
assert.ok(skill.includes('ae-cli engage-flow operation-log query'));
assert.ok(skill.includes('ae-cli engage-task segment-list query'));
assert.ok(skill.includes('ae-cli engage-task group list'));
assert.doesNotMatch(skill, /engage-flow test run|references\/test-run\.md/);
assert.doesNotMatch(skill, /ae-cli capability/);
assert.doesNotMatch(skill, /Temporarily disabled engage-task commands/);

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

// ---- 28 engage-setting capabilities: skill reference docs linked in SKILL.md ----
const expectedSettingReferenceLinks = [
  'references/channel_touch_limits_list.md',
  'references/channel-touch-limits-batch-update.md',
  'references/channel-touch-limits-toggle.md',
  'references/channel-touch-limits-save.md',
  'references/channel-update-config.md',
  'references/channel-test-send.md',
  'references/approval-approver-delete.md',
  'references/whitelist.md',
  'references/push-language.md',
  'references/client-param.md',
  'references/config-table.md',
  'references/preset-event.md',
  'references/common-metric.md',
];
for (const link of expectedSettingReferenceLinks) {
  assert.match(skill, new RegExp(link.replace(/\./g, '\\.')),
    `SKILL.md missing reference link: ${link}`);
}
const expectedSettingCapabilityIds = [
  'engage-setting\\.channel\\.update-config',
  'engage-setting\\.channel\\.test-send',
  'engage-setting\\.channel-touch-limits\\.list',
  'engage-setting\\.channel-touch-limits\\.batch-update',
  'engage-setting\\.channel-touch-limits\\.toggle',
  'engage-setting\\.channel-touch-limits\\.save',
  'engage-setting\\.approval-approver\\.delete',
  'engage-setting\\.whitelist\\.\\{add,update,delete,verify\\}',
  'engage-setting\\.push-language\\.\\{get,set\\}',
  'engage-setting\\.client-param\\.\\{update,delete,list\\}',
  'engage-setting\\.config-table\\.\\{upload,save,list,query-data,update-data,delete\\}',
  'engage-setting\\.preset-event\\.\\{list,update\\}',
  'engage-setting\\.common-metric\\.\\{list,get,update,delete\\}',
];
for (const idPattern of expectedSettingCapabilityIds) {
  assert.match(skill, new RegExp(idPattern),
    `SKILL.md missing capability id: ${idPattern}`);
}
// Every new command must appear as a "<resource> <action>" token in the command-groups line.
const expectedSettingCommandTokens = [
  'channel update-config', 'channel test-send',
  'channel-touch-limits list', 'channel-touch-limits batch-update',
  'channel-touch-limits toggle', 'channel-touch-limits save',
  'approval-approver delete',
  'whitelist add', 'whitelist update', 'whitelist delete', 'whitelist verify',
  'push-language get', 'push-language set',
  'client-param update', 'client-param delete', 'client-param list',
  'config-table upload', 'config-table save', 'config-table list',
  'config-table query-data', 'config-table update-data', 'config-table delete',
  'preset-event list', 'preset-event update',
  'common-metric list', 'common-metric get',
  'common-metric update', 'common-metric delete',
];
for (const token of expectedSettingCommandTokens) {
  assert.ok(skill.includes(token),
    `SKILL.md missing command token: ${token}`);
}
// A sample of the new reference docs must exist and declare the capability id header.
const whitelistRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/whitelist.md'), 'utf8');
assert.match(whitelistRef, /engage-setting\.whitelist\.\{add,update,delete,verify\}/);
const configTableRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/config-table.md'), 'utf8');
assert.match(configTableRef, /engage-setting\.config-table\.\{upload,save,list,query-data,update-data,delete\}/);
const commonMetricRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/common-metric.md'), 'utf8');
assert.match(commonMetricRef, /engage-setting\.common-metric\.\{list,get,update,delete\}/);

// ---- 34 engage-scene (场景管理/配置中心) capabilities: skill reference docs linked in SKILL.md ----
const expectedSceneReferenceLinks = [
  'references/scene-config-item.md',
  'references/scene-config-param.md',
  'references/scene-config-group.md',
  'references/scene-preset-metric.md',
  'references/scene-config-metric.md',
  'references/scene-config-channel.md',
  'references/scene-strategy.md',
  'references/scene-template.md',
];
for (const link of expectedSceneReferenceLinks) {
  assert.match(skill, new RegExp(link.replace(/\./g, '\\.')),
    `SKILL.md missing reference link: ${link}`);
}
const expectedSceneCapabilityIds = [
  'engage-scene\\.config-item\\.\\{list,create,update\\}',
  'engage-scene\\.config-param\\.\\{list,batch-add,update,batch-delete\\}',
  'engage-scene\\.config-group\\.\\{list,batch-add,update,batch-delete\\}',
  'engage-scene\\.preset-metric\\.\\{get,set\\}',
  'engage-scene\\.config-metric\\.\\{list,get,batch-add,update-rule,batch-delete\\}',
  'engage-scene\\.config-channel\\.\\{create,update,query-log\\}',
  'engage-scene\\.strategy\\.\\{create,update,log,batch-copy\\}',
  'engage-scene\\.template\\.\\{list,get,create,update,update-status,delete\\}',
];
for (const idPattern of expectedSceneCapabilityIds) {
  assert.match(skill, new RegExp(idPattern),
    `SKILL.md missing capability id: ${idPattern}`);
}
// Every scene command must appear as a "<resource> <action>" token in the command-groups line.
const expectedSceneCommandTokens = [
  'config-item list', 'config-item create', 'config-item update',
  'config-param list', 'config-param batch-add', 'config-param update', 'config-param batch-delete',
  'config-group list', 'config-group batch-add', 'config-group update', 'config-group batch-delete',
  'preset-metric get', 'preset-metric set',
  'config-metric list', 'config-metric get', 'config-metric batch-add',
  'config-metric update-rule', 'config-metric batch-delete',
  'config-channel create', 'config-channel update', 'config-channel query-log',
  'strategy create', 'strategy update', 'strategy log', 'strategy batch-copy',
  'template list', 'template get', 'template create', 'template update',
  'template update-status', 'template delete',
];
assert.equal(expectedSceneCommandTokens.length, 31, 'expected 31 engage-scene command tokens');
for (const token of expectedSceneCommandTokens) {
  assert.ok(skill.includes(token),
    `SKILL.md missing command token: ${token}`);
}
// A sample of the new reference docs must exist and declare the capability id header.
const sceneStrategyRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/scene-strategy.md'), 'utf8');
assert.match(sceneStrategyRef, /engage-scene\.strategy\.\{create,update,log,batch-copy\}/);
const sceneTemplateRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/scene-template.md'), 'utf8');
assert.match(sceneTemplateRef, /engage-scene\.template\.\{list,get,create,update,update-status,delete\}/);
const sceneConfigParamRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/scene-config-param.md'), 'utf8');
assert.match(sceneConfigParamRef, /engage-scene\.config-param\.\{list,batch-add,update,batch-delete\}/);

// ---- 27 engage-activity (运营活动) capabilities: skill reference docs linked in SKILL.md ----
const expectedActivityReferenceLinks = [
  'references/activity-activity.md',
  'references/activity-approval.md',
  'references/activity-topic.md',
  'references/activity-activity-type.md',
  'references/activity-task.md',
];
for (const link of expectedActivityReferenceLinks) {
  assert.match(skill, new RegExp(link.replace(/\./g, '\\.')),
    `SKILL.md missing reference link: ${link}`);
}
const expectedActivityCapabilityIds = [
  'engage-activity\\.activity\\.\\{create,update,delete,list,get,pause,end,stats,info-list\\}',
  'engage-activity\\.approval\\.\\{submit,approve,reject,cancel\\}',
  'engage-activity\\.topic\\.\\{remove-task,delete,get,copy\\}',
  'engage-activity\\.activity-type\\.\\{list,batch-add,update,batch-delete\\}',
  'engage-activity\\.task\\.\\{get,copy\\}',
];
for (const idPattern of expectedActivityCapabilityIds) {
  assert.match(skill, new RegExp(idPattern),
    `SKILL.md missing capability id: ${idPattern}`);
}
const expectedActivityCommandTokens = [
  'activity create', 'activity update', 'activity delete', 'activity list', 'activity get',
  'activity pause', 'activity end', 'activity stats', 'activity info-list',
  'approval submit', 'approval approve', 'approval reject', 'approval cancel',
  'topic remove-task', 'topic delete', 'topic get', 'topic copy',
  'activity-type list', 'activity-type batch-add', 'activity-type update', 'activity-type batch-delete',
  'task get', 'task copy',
];
assert.equal(expectedActivityCommandTokens.length, 23, 'expected 23 engage-activity command tokens');
for (const token of expectedActivityCommandTokens) {
  assert.ok(skill.includes(token),
    `SKILL.md missing command token: ${token}`);
}
const activityActivityRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/activity-activity.md'), 'utf8');
assert.match(activityActivityRef, /engage-activity\.activity\.\{create,update,delete,list,get,pause,end,stats,info-list\}/);
const activityTopicRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/activity-topic.md'), 'utf8');
assert.match(activityTopicRef, /engage-activity\.topic\.\{remove-task,delete,get,copy\}/);
const activityTaskRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/activity-task.md'), 'utf8');
assert.match(activityTaskRef, /engage-activity\.task\.\{get,copy\}/);

// ---- 4 engage-workbench (工作台) capabilities: skill reference docs linked in SKILL.md ----
const expectedWorkbenchReferenceLinks = [
  'references/workbench-workbench.md',
];
for (const link of expectedWorkbenchReferenceLinks) {
  assert.match(skill, new RegExp(link.replace(/\./g, '\\.')),
    `SKILL.md missing reference link: ${link}`);
}
const expectedWorkbenchCapabilityIds = [
  'engage-workbench\\.workbench\\.\\{list,add,update,delete\\}',
];
for (const idPattern of expectedWorkbenchCapabilityIds) {
  assert.match(skill, new RegExp(idPattern),
    `SKILL.md missing capability id: ${idPattern}`);
}
const expectedWorkbenchCommandTokens = [
  'workbench list', 'workbench add', 'workbench update', 'workbench delete',
];
assert.equal(expectedWorkbenchCommandTokens.length, 4, 'expected 4 engage-workbench command tokens');
for (const token of expectedWorkbenchCommandTokens) {
  assert.ok(skill.includes(token),
    `SKILL.md missing command token: ${token}`);
}
const workbenchRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/workbench-workbench.md'), 'utf8');
assert.match(workbenchRef, /engage-workbench\.workbench\.\{list,add,update,delete\}/);

process.stdout.write('engage skill capability contract: OK\n');
