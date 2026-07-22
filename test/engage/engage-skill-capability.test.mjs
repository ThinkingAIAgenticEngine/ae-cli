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
const flowUpdateRemarkRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/flow-update-remark.md'),
  'utf8',
);
const operationLogRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/operation-log-query.md'),
  'utf8',
);
const saveFlowRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/save-flow.md'),
  'utf8',
);
const flowDetailRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/flow-detail.md'),
  'utf8',
);
const flowListRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/flow-list.md'),
  'utf8',
);
const channelListRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/channel-list.md'),
  'utf8',
);
const channelDetailRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/channel-detail.md'),
  'utf8',
);
const saveTaskRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/save-task.md'),
  'utf8',
);
const addChannelRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/add-channel.md'),
  'utf8',
);
const saveFlowRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/save-flow.md'),
  'utf8',
);
const flowDetailRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/flow-detail.md'),
  'utf8',
);
const flowListRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/flow-list.md'),
  'utf8',
);
const channelListRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/channel-list.md'),
  'utf8',
);
const channelDetailRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/channel-detail.md'),
  'utf8',
);
const saveTaskRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/save-task.md'),
  'utf8',
);
const addChannelRef = readFileSync(
  path.join(ROOT, 'skills/ae-engage/references/add-channel.md'),
  'utf8',
);

const touchLimitsCommand =
  'ae-cli engage-setting channel-touch-limits list --project-id <project_id>';
const versionListCommand =
  'ae-cli engage-flow version list --project-id <project-id> --flow-id <flow-id>';
const flowUpdateRemarkCommand =
  'ae-cli engage-flow flow update-remark --project-id <project-id> --flow-uuid <flow-uuid> --flow-version-desc <remark>';

assert.match(skill, /engage-setting\.channel-touch-limits\.list/);
assert.match(skill, /references\/channel_touch_limits_list\.md/);
assert.match(skill, /references\/operation-log-query\.md/);
assert.match(skill, /references\/version-list\.md/);
assert.match(skill, /references\/flow-update-remark\.md/);
assert.match(skill, /references\/segment-list-query\.md/);
assert.match(skill, /references\/group-list\.md/);
assert.match(skill, /references\/task-delete\.md/);
assert.ok(skill.includes(touchLimitsCommand));
assert.ok(skill.includes('ae-cli engage-flow version list'));
assert.ok(skill.includes('ae-cli engage-flow flow update-remark'));
assert.ok(skill.includes('ae-cli engage-flow operation-log query'));
assert.ok(skill.includes('ae-cli engage-task segment-list query'));
assert.ok(skill.includes('ae-cli engage-task group list'));
assert.doesNotMatch(skill, /ae-cli engage-flow test run/);
assert.doesNotMatch(skill, /ae-cli engage-task task submit-approval/);
assert.doesNotMatch(skill, /ae-cli engage-activity approval submit/);
assert.doesNotMatch(skill, /references\/test-run\.md/);
assert.doesNotMatch(skill, /references\/task-submit-approval\.md/);
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

assert.match(flowUpdateRemarkRef, /^# engage-flow flow update-remark$/m);
assert.match(
  flowUpdateRemarkRef,
  /Capability id: `engage-flow\.version\.update-remark` · Domain: `engage`/,
);
assert.ok(flowUpdateRemarkRef.includes(flowUpdateRemarkCommand));
assert.match(flowUpdateRemarkRef, /`--project-id`/);
assert.match(flowUpdateRemarkRef, /`--flow-uuid`/);
assert.match(flowUpdateRemarkRef, /`--flow-version-desc`/);

assert.match(operationLogRef, /engage-flow operation-log query/);

// Migrated Capability boundaries keep outer input/output snake_case and nested DTO input camelCase.
assert.match(skill, /outer Capability input and all Capability response keys use snake_case/);
assert.match(skill, /Nested business DTOs passed through `--req` or `--payload` keep their documented native camelCase fields/);
assert.match(skill, /data\.result\.result\.flow_uuid/);
assert.match(saveFlowRef, /data\.result\.draft_version/);
assert.match(saveFlowRef, /data\.flow\.node_list/);
assert.match(saveFlowRef, /data\.item\.config\.params_list/);
assert.match(saveFlowRef, /channel_status = 0/);
assert.doesNotMatch(saveFlowRef, /data\.config\.paramsList|channelStatus\s*=\s*2/);
assert.match(flowDetailRef, /data\.flow\.node_list\[\]\.type/);
assert.match(flowDetailRef, /data\.flow\.mapping_status/);
assert.doesNotMatch(flowDetailRef, /### `(?:mappingStatus|nodeList|channelStatus)`/);
assert.match(flowListRef, /data\.items\[\]\.flow_id/);
assert.match(channelListRef, /data\.items\[\]\.channel_status/);
assert.match(channelDetailRef, /data\.item\.channel_status/);
assert.match(channelDetailRef, /data\.item\.config\.params_list/);
assert.doesNotMatch(channelDetailRef, /### `channelStatus`/);
assert.match(saveTaskRef, /data\.result\.operation_mode/);
assert.match(saveTaskRef, /Hermes assigns the outer `--project-id` to `req\.projectId`/);
assert.match(addChannelRef, /created channel is under `data\.item`/);
assert.match(addChannelRef, /Hermes Capability handler/);
assert.doesNotMatch(addChannelRef, /projectId is injected into `req` by the CLI/);

// Migrated Capability boundaries keep outer input/output snake_case and nested DTO input camelCase.
assert.match(skill, /outer Capability input and all Capability response keys use snake_case/);
assert.match(skill, /Nested business DTOs passed through `--req` or `--payload` keep their documented native camelCase fields/);
assert.match(skill, /data\.result\.result\.flow_uuid/);
assert.match(saveFlowRef, /data\.result\.draft_version/);
assert.match(saveFlowRef, /data\.flow\.node_list/);
assert.match(saveFlowRef, /data\.item\.config\.params_list/);
assert.match(saveFlowRef, /channel_status = 0/);
assert.doesNotMatch(saveFlowRef, /data\.config\.paramsList|channelStatus\s*=\s*2/);
assert.match(flowDetailRef, /data\.flow\.node_list\[\]\.type/);
assert.match(flowDetailRef, /data\.flow\.mapping_status/);
assert.doesNotMatch(flowDetailRef, /### `(?:mappingStatus|nodeList|channelStatus)`/);
assert.match(flowListRef, /data\.items\[\]\.flow_id/);
assert.match(channelListRef, /data\.items\[\]\.channel_status/);
assert.match(channelDetailRef, /data\.item\.channel_status/);
assert.match(channelDetailRef, /data\.item\.config\.params_list/);
assert.doesNotMatch(channelDetailRef, /### `channelStatus`/);
assert.match(saveTaskRef, /data\.result\.operation_mode/);
assert.match(saveTaskRef, /Hermes assigns the outer `--project-id` to `req\.projectId`/);
assert.match(addChannelRef, /created channel is under `data\.item`/);
assert.match(addChannelRef, /Hermes Capability handler/);
assert.doesNotMatch(addChannelRef, /projectId is injected into `req` by the CLI/);

// ---- engage-setting capabilities: skill reference docs linked in SKILL.md ----
const expectedSettingReferenceLinks = [
  'references/channel_touch_limits_list.md',
  'references/channel-touch-limits-batch-update.md',
  'references/channel-touch-limits-toggle.md',
  'references/channel-touch-limits-save.md',
  'references/channel-update-config.md',
  'references/channel-test-send.md',
  'references/channel-list.md',
  'references/channel-detail.md',
  'references/add-channel.md',
  'references/update-channel-status.md',
  'references/delete-channel.md',
  'references/approval-approver-delete.md',
  'references/add-approver.md',
  'references/approver-list.md',
  'references/whitelist-list.md',
  'references/cancel-query-by-request-id.md',
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
  'engage-setting\\.channel\\.list',
  'engage-setting\\.channel\\.get',
  'engage-setting\\.channel\\.create',
  'engage-setting\\.channel\\.update-status',
  'engage-setting\\.channel\\.delete',
  'engage-setting\\.channel-touch-limits\\.list',
  'engage-setting\\.channel-touch-limits\\.batch-update',
  'engage-setting\\.channel-touch-limits\\.toggle',
  'engage-setting\\.channel-touch-limits\\.save',
  'engage-setting\\.approval-approver\\.delete',
  'engage-setting\\.approval-approver\\.\\{add,list\\}',
  'engage-setting\\.whitelist\\.\\{list,add,update,delete,verify\\}',
  'engage-setting\\.query\\.cancel',
  'engage-setting\\.push-language\\.\\{get,set\\}',
  'engage-setting\\.client-param\\.\\{create,update,delete,list\\}',
  'engage-setting\\.config-table\\.\\{upload,save,list,query-data,update-data,delete\\}',
  'engage-setting\\.preset-event\\.\\{list,update\\}',
  'engage-setting\\.common-metric\\.\\{list,get,create,update,delete\\}',
];
for (const idPattern of expectedSettingCapabilityIds) {
  assert.match(skill, new RegExp(idPattern),
    `SKILL.md missing capability id: ${idPattern}`);
}
// Every new command must appear as a "<resource> <action>" token in the command-groups line.
const expectedSettingCommandTokens = [
  'channel update-config', 'channel test-send', 'channel list', 'channel get',
  'channel create', 'channel update-status', 'channel delete',
  'channel-touch-limits list', 'channel-touch-limits batch-update',
  'channel-touch-limits toggle', 'channel-touch-limits save',
  'approval-approver add', 'approval-approver list', 'approval-approver delete',
  'whitelist list', 'whitelist add', 'whitelist update', 'whitelist delete', 'whitelist verify',
  'push-language get', 'push-language set',
  'client-param create', 'client-param update', 'client-param delete', 'client-param list',
  'config-table upload', 'config-table save', 'config-table list',
  'config-table query-data', 'config-table update-data', 'config-table delete',
  'preset-event list', 'preset-event update',
  'common-metric list', 'common-metric get',
  'common-metric create', 'common-metric update', 'common-metric delete',
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
assert.match(commonMetricRef, /engage-setting\.common-metric\.\{list,get,create,update,delete\}/);
assert.match(commonMetricRef, /analysis-meta event list/);
assert.match(commonMetricRef, /`minute` \/ `hour` \/ `day`/);
assert.match(commonMetricRef, /opsEditSetting/);

// ---- 41 engage-scene L2 + 3 L3 report capabilities: skill reference docs linked in SKILL.md ----
const expectedSceneReferenceLinks = [
  'references/scene-config-item.md',
  'references/scene-config-param.md',
  'references/scene-config-group.md',
  'references/scene-preset-metric.md',
  'references/scene-config-metric.md',
  'references/scene-config-channel.md',
  'references/scene-strategy.md',
  'references/scene-template.md',
  'references/config-item-trigger-report.md',
  'references/config-item-analysis-report.md',
  'references/config-item-strategy-comparison.md',
];
for (const link of expectedSceneReferenceLinks) {
  assert.match(skill, new RegExp(link.replace(/\./g, '\\.')),
    `SKILL.md missing reference link: ${link}`);
}
const expectedSceneCapabilityIds = [
  'engage-scene\\.config-item\\.\\{list,get,create,update,delete\\}',
  'engage-scene\\.config-param\\.\\{list,batch-add,update,batch-delete\\}',
  'engage-scene\\.config-group\\.\\{list,batch-add,update,batch-delete\\}',
  'engage-scene\\.preset-metric\\.\\{get,set\\}',
  'engage-scene\\.config-metric\\.\\{list,get,batch-add,update-rule,batch-delete\\}',
  'engage-scene\\.config-channel\\.\\{list,get,create,update,update-status,delete,query-log\\}',
  'engage-scene\\.strategy\\.\\{list,get,create,update,log,batch-copy,manage\\}',
  'engage-scene\\.template\\.\\{list,get,copy,create,update,update-status,delete\\}',
  'engage-scene\\.report\\.\\{config-item-trigger,config-item-analysis,strategy-comparison\\}',
];
for (const idPattern of expectedSceneCapabilityIds) {
  assert.match(skill, new RegExp(idPattern),
    `SKILL.md missing capability id: ${idPattern}`);
}
// Every scene command must appear as a "<resource> <action>" token in the command-groups line.
const expectedSceneCommandTokens = [
  'config-item list', 'config-item get', 'config-item create', 'config-item update', 'config-item delete',
  'config-param list', 'config-param batch-add', 'config-param update', 'config-param batch-delete',
  'config-group list', 'config-group batch-add', 'config-group update', 'config-group batch-delete',
  'preset-metric get', 'preset-metric set',
  'config-metric list', 'config-metric get', 'config-metric batch-add',
  'config-metric update-rule', 'config-metric batch-delete',
  'config-channel list', 'config-channel get', 'config-channel create',
  'config-channel update', 'config-channel update-status', 'config-channel delete',
  'config-channel query-log',
  'strategy list', 'strategy get', 'strategy create', 'strategy update', 'strategy log',
  'strategy batch-copy', 'strategy manage',
  'template list', 'template get', 'template copy', 'template create', 'template update',
  'template update-status', 'template delete',
];
assert.equal(expectedSceneCommandTokens.length, 41, 'expected 41 engage-scene command tokens');
for (const token of expectedSceneCommandTokens) {
  assert.ok(skill.includes(token),
    `SKILL.md missing command token: ${token}`);
}
// A sample of the new reference docs must exist and declare the capability id header.
const sceneStrategyRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/scene-strategy.md'), 'utf8');
assert.match(sceneStrategyRef, /engage-scene\.strategy\.\{list,get,create,update,log,batch-copy,manage\}/);
const sceneTemplateRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/scene-template.md'), 'utf8');
assert.match(sceneTemplateRef, /engage-scene\.template\.\{list,get,copy,create,update,update-status,delete\}/);
const sceneConfigParamRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/scene-config-param.md'), 'utf8');
assert.match(sceneConfigParamRef, /engage-scene\.config-param\.\{list,batch-add,update,batch-delete\}/);

// ---- 26 engage-activity (运营活动) capabilities: skill reference docs linked in SKILL.md ----
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
  'engage-activity\\.approval\\.\\{approve,reject,cancel\\}',
  'engage-activity\\.topic\\.\\{create,update,remove-task,delete,get,copy\\}',
  'engage-activity\\.activity-type\\.\\{list,batch-add,update,batch-delete\\}',
  'engage-activity\\.task\\.\\{get,create,update,copy\\}',
];
for (const idPattern of expectedActivityCapabilityIds) {
  assert.match(skill, new RegExp(idPattern),
    `SKILL.md missing capability id: ${idPattern}`);
}
const expectedActivityCommandTokens = [
  'activity create', 'activity update', 'activity delete', 'activity list', 'activity get',
  'activity pause', 'activity end', 'activity stats', 'activity info-list',
  'approval approve', 'approval reject', 'approval cancel',
  'topic create', 'topic update', 'topic remove-task', 'topic delete', 'topic get', 'topic copy',
  'activity-type list', 'activity-type batch-add', 'activity-type update', 'activity-type batch-delete',
  'task get', 'task create', 'task update', 'task copy',
];
assert.equal(expectedActivityCommandTokens.length, 26, 'expected 26 engage-activity command tokens');
for (const token of expectedActivityCommandTokens) {
  assert.ok(skill.includes(token),
    `SKILL.md missing command token: ${token}`);
}
assert.doesNotMatch(skill, /approval submit/);
const activityActivityRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/activity-activity.md'), 'utf8');
assert.match(activityActivityRef, /engage-activity\.activity\.\{create,update,delete,list,get,pause,end,stats,info-list\}/);
const activityTopicRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/activity-topic.md'), 'utf8');
assert.match(activityTopicRef, /engage-activity\.topic\.\{create,update,remove-task,delete,get,copy\}/);
const activityTaskRef = readFileSync(path.join(ROOT, 'skills/ae-engage/references/activity-task.md'), 'utf8');
assert.match(activityTaskRef, /engage-activity\.task\.\{get,create,update,copy\}/);

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
