import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { channelTouchLimitsList } from '../../src/commands/te-engage/engage-setting/channel-touch-limits/list.ts';
import { channelList } from '../../src/commands/te-engage/engage-setting/channel/list.ts';
import { approvalApproverAdd } from '../../src/commands/te-engage/engage-setting/approval-approver/add.ts';
import { flowUpdateRemark } from '../../src/commands/te-engage/engage-flow/flow/update-remark.ts';
import { flowDelete } from '../../src/commands/te-engage/engage-flow/flow/delete.ts';
import { flowList } from '../../src/commands/te-engage/engage-flow/flow/list.ts';
import { operationLogQuery } from '../../src/commands/te-engage/engage-flow/operation-log/query.ts';
import { testRun } from '../../src/commands/te-engage/engage-flow/test/run.ts';
import { operationLogQuery as taskOperationLogQuery } from '../../src/commands/te-engage/engage-task/operation-log/query.ts';
import { segmentListQuery } from '../../src/commands/te-engage/engage-task/segment-list/query.ts';
import { taskDelete } from '../../src/commands/te-engage/engage-task/task/delete.ts';
import { taskList } from '../../src/commands/te-engage/engage-task/task/list.ts';
import { taskManage } from '../../src/commands/te-engage/engage-task/task/manage.ts';
import { taskSubmitApproval } from '../../src/commands/te-engage/engage-task/task/submit-approval.ts';
import { groupList } from '../../src/commands/te-engage/engage-task/group/list.ts';
import { clientParamUpdate } from '../../src/commands/te-engage/engage-setting/client-param/update.ts';
import { taskCreate as activityTaskCreate } from '../../src/commands/te-engage/engage-activity/task/create.ts';
import { topicCreate as activityTopicCreate } from '../../src/commands/te-engage/engage-activity/topic/create.ts';
import { capabilityGatewayHint } from '../../src/framework/runner.ts';
import { CapabilityGatewayError } from '../../src/core/capability-api.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../../src/core/cli-token.ts';

const ROOT = process.cwd();
const HOST = 'http://localhost';

clearCapabilityGatewayRoutesForTest();
registerCapabilityGatewayRoute('engage-flow', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-task', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-setting', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-scene', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-activity', { gatewayDomain: 'engage' });
registerCapabilityGatewayRoute('engage-workbench', { gatewayDomain: 'engage' });

function runCli(args) {
  return spawnSync('npx', ['tsx', 'src/index.ts', '--host', HOST, '--no-update-check', ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
}

function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function makeCtx(opts) {
  return {
    str(name) {
      return String(opts[camelCase(name)] ?? '');
    },
    num(name) {
      const val = opts[camelCase(name)];
      return val !== undefined ? Number(val) : 0;
    },
    optionalNum(name) {
      const val = opts[camelCase(name)];
      return val !== undefined && val !== null && val !== '' ? Number(val) : undefined;
    },
    bool(name) {
      return Boolean(opts[camelCase(name)]);
    },
    json(name) {
      const val = opts[camelCase(name)];
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'object') return val;
      return JSON.parse(String(val));
    },
    host() {
      return HOST;
    },
    mcpUrl() {
      return undefined;
    },
    service() {
      return 'engage-flow';
    },
  };
}

async function captureCapabilityDryRun(cmd, opts) {
  setCliTokenManual('cli-test-token', HOST);
  let capturedUrl = '';
  let capturedBody;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  try {
    const result = await cmd.dryRun(makeCtx(opts));
    assert.equal(JSON.stringify(result), JSON.stringify({ dry_run: true }));
    return { url: capturedUrl, body: capturedBody };
  } finally {
    globalThis.fetch = prevFetch;
    clearCliToken(HOST);
  }
}

const touchLimitsDryRun = await captureCapabilityDryRun(channelTouchLimitsList, {
  projectId: 1,
});
assert.equal(
  touchLimitsDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-setting.channel-touch-limits.list/dry-run`,
);
assert.deepEqual(touchLimitsDryRun.body, { input: { project_id: 1 } });

const channelListDryRun = await captureCapabilityDryRun(channelList, {
  projectId: 1,
  providerList: ['webhook'],
  channelStatus: 0,
});
assert.equal(
  channelListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-setting.channel.list/dry-run`,
);
assert.deepEqual(channelListDryRun.body, {
  input: { project_id: 1, provider_list: ['webhook'], channel_status: 0 },
});

const approverAddDryRun = await captureCapabilityDryRun(approvalApproverAdd, {
  projectId: 1,
  approvers: ['ou_1', 'ou_2'],
});
assert.equal(
  approverAddDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-setting.approval-approver.add/dry-run`,
);
assert.deepEqual(approverAddDryRun.body, {
  input: { project_id: 1, approvers: ['ou_1', 'ou_2'] },
});

const removedSettingCommand = runCli(['engage', '+channel_list', '--help']);
assert.notEqual(removedSettingCommand.status, 0, 'legacy +channel_list must no longer be registered');

const opLogDryRun = await captureCapabilityDryRun(operationLogQuery, {
  projectId: 1,
  flowId: 'flow_id_123',
});
assert.equal(
  opLogDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-flow.operation-log.query/dry-run`,
);
assert.deepEqual(opLogDryRun.body, {
  input: { project_id: 1, flow_id: 'flow_id_123' },
});

const testRunDryRun = await captureCapabilityDryRun(testRun, {
  flowUuid: 'flow_uuid_123',
});
assert.equal(
  testRunDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-flow.test.run/dry-run`,
);
assert.deepEqual(testRunDryRun.body, {
  input: { flow_uuid: 'flow_uuid_123' },
});

const flowUpdateRemarkDryRun = await captureCapabilityDryRun(flowUpdateRemark, {
  projectId: 1,
  flowUuid: 'flow_uuid_123',
  flowVersionDesc: 'new remark',
});

const flowListDryRun = await captureCapabilityDryRun(flowList, { projectId: 1 });
assert.equal(
  flowListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-flow.flow.list/dry-run`,
);
assert.deepEqual(flowListDryRun.body, { input: { project_id: 1 } });

const flowDeleteDryRun = await captureCapabilityDryRun(flowDelete, {
  projectId: 1,
  flowUuidList: ['flow_uuid_123'],
});
assert.equal(
  flowDeleteDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-flow.flow.delete/dry-run`,
);
assert.deepEqual(flowDeleteDryRun.body, {
  input: { project_id: 1, flow_uuid_list: ['flow_uuid_123'] },
});
assert.equal(
  flowUpdateRemarkDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-flow.version.update-remark/dry-run`,
);
assert.deepEqual(flowUpdateRemarkDryRun.body, {
  input: { project_id: 1, flow_uuid: 'flow_uuid_123', flow_version_desc: 'new remark' },
});

const taskLogDryRun = await captureCapabilityDryRun(taskOperationLogQuery, {
  projectId: 1,
  taskId: 'task-1',
});
assert.equal(
  taskLogDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-task.operation-log.query/dry-run`,
);
assert.deepEqual(taskLogDryRun.body, {
  input: { project_id: 1, task_id: 'task-1' },
});

const taskListDryRun = await captureCapabilityDryRun(taskList, {
  projectId: 1,
  req: { pageNum: 1, pageSize: 20 },
});
assert.equal(
  taskListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-task.task.list/dry-run`,
);
assert.deepEqual(taskListDryRun.body, {
  input: { project_id: 1, req: { pageNum: 1, pageSize: 20 } },
});

const taskManageDryRun = await captureCapabilityDryRun(taskManage, {
  projectId: 1,
  taskId: 'task-1',
  action: 'pause',
  reason: 'maintenance',
});
assert.equal(
  taskManageDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-task.task.manage/dry-run`,
);
assert.deepEqual(taskManageDryRun.body, {
  input: { project_id: 1, task_id: 'task-1', action: 'pause', reason: 'maintenance' },
});

const migratedTaskHelp = runCli(['engage-task', 'task', 'list', '--help']);
assert.equal(migratedTaskHelp.status, 0, migratedTaskHelp.stderr || migratedTaskHelp.stdout);
assert.match(migratedTaskHelp.stdout, /--req <value>/);

const removedTaskCommand = runCli(['engage', '+task_list', '--help']);
assert.notEqual(removedTaskCommand.status, 0, 'legacy +task_list must no longer be registered');

const help = runCli(['engage-setting', 'channel-touch-limits', 'list', '--help']);
assert.equal(help.status, 0, help.stderr || help.stdout);
assert.match(help.stdout, /-p, --project-id <value>/);

const badChannelTestSendContent = runCli([
  '--dry-run',
  'engage-setting',
  'channel',
  'test-send',
  '--project-id',
  '1',
  '--channel-id',
  'channel-1',
  '--push-id',
  'recipient-1',
  '--content-list',
  '[{"pushLanguageCode":"default","content":"[]"}]',
]);
assert.notEqual(badChannelTestSendContent.status, 0);
const badChannelTestSendContentError = JSON.parse(badChannelTestSendContent.stderr);
assert.equal(badChannelTestSendContentError.error.type, 'validation');
assert.match(badChannelTestSendContentError.error.message, /expects direct key\/value entries/);
assert.match(badChannelTestSendContentError.error.hint, /\{"key":"obj","value":"\[\]"\}/);

const emptyCommonMetricDefinition = runCli([
  '--dry-run',
  'engage-setting',
  'common-metric',
  'update',
  '--project-id',
  '1',
  '--metric-type',
  '1',
  '--metric-name',
  'm1',
  '--metric-definition',
  '{}',
  '--metric-window-num',
  '1',
  '--metric-window-time-unit',
  'day',
  '--display-name',
  'M1',
]);
assert.notEqual(emptyCommonMetricDefinition.status, 0);
const emptyCommonMetricDefinitionError = JSON.parse(emptyCommonMetricDefinition.stderr);
assert.equal(emptyCommonMetricDefinitionError.error.type, 'validation');
assert.match(emptyCommonMetricDefinitionError.error.message, /--metric-definition.type must be event or formula/);

const invalidCommonMetricDefinition = runCli([
  '--dry-run',
  'engage-setting',
  'common-metric',
  'create',
  '--project-id',
  '1',
  '--metric-type',
  '1',
  '--metric-name',
  'm1',
  '--metric-definition',
  'event',
  '--metric-window-num',
  '1',
  '--metric-window-time-unit',
  'day',
  '--display-name',
  'M1',
]);
assert.notEqual(invalidCommonMetricDefinition.status, 0);
const invalidCommonMetricDefinitionError = JSON.parse(invalidCommonMetricDefinition.stderr);
assert.equal(invalidCommonMetricDefinitionError.error.type, 'validation');
assert.match(invalidCommonMetricDefinitionError.error.message, /Invalid JSON for --metric-definition/);

const invalidCommonMetricWindowUnit = runCli([
  '--dry-run',
  'engage-setting',
  'common-metric',
  'create',
  '--project-id',
  '1',
  '--metric-type',
  '1',
  '--metric-name',
  'm1',
  '--metric-definition',
  '{"type":"event","event":"purchase","aggregation":"total_count"}',
  '--metric-window-num',
  '1',
  '--metric-window-time-unit',
  'DAY',
  '--display-name',
  'M1',
]);
assert.notEqual(invalidCommonMetricWindowUnit.status, 0);
const invalidCommonMetricWindowUnitError = JSON.parse(invalidCommonMetricWindowUnit.stderr);
assert.equal(invalidCommonMetricWindowUnitError.error.type, 'validation');
assert.match(invalidCommonMetricWindowUnitError.error.message, /minute, hour, day/);

const invalidCommonMetricType = runCli([
  '--dry-run',
  'engage-setting',
  'common-metric',
  'create',
  '--project-id',
  '1',
  '--metric-type',
  '2',
  '--metric-name',
  'm1',
  '--metric-definition',
  '{"type":"event","event":"purchase","aggregation":"total_count"}',
  '--metric-window-num',
  '1',
  '--metric-window-time-unit',
  'day',
  '--display-name',
  'M1',
]);
assert.notEqual(invalidCommonMetricType.status, 0);
const invalidCommonMetricTypeError = JSON.parse(invalidCommonMetricType.stderr);
assert.equal(invalidCommonMetricTypeError.error.type, 'validation');
assert.match(invalidCommonMetricTypeError.error.message, /--metric-type must be 1/);

const configTableMissingUploadHint = capabilityGatewayHint(new CapabilityGatewayError(
  'No data to save, please upload again.',
  'UPLOAD_NOT_EXIST',
  400,
  undefined,
  { capability_id: 'engage-setting.config-table.save' },
));
assert.match(configTableMissingUploadHint, /config-table upload first/);
assert.match(configTableMissingUploadHint, /same --project-id and --request-id/);

const clientParamUpdateWithoutDesc = await captureCapabilityDryRun(clientParamUpdate, {
  projectId: 1,
  columnName: 'client_level',
});
assert.equal(clientParamUpdateWithoutDesc.body.input.column_desc, undefined);
assert.equal(clientParamUpdateWithoutDesc.body.input.column_type, undefined);
assert.equal(
  clientParamUpdateWithoutDesc.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-setting.client-param.update/dry-run`,
);

const clientParamCreateDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-setting/client-param/create.ts')).clientParamCreate,
  { projectId: 1, columnName: 'client_level', columnType: 'varchar', columnDesc: 'Level' },
);
assert.equal(
  clientParamCreateDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-setting.client-param.create/dry-run`,
);
assert.deepEqual(clientParamCreateDryRun.body, {
  input: {
    project_id: 1,
    column_name: 'client_level',
    column_type: 'varchar',
    column_desc: 'Level',
  },
});

const versionHelp = runCli(['engage-flow', 'version', 'list', '--help']);
assert.equal(versionHelp.status, 0, versionHelp.stderr || versionHelp.stdout);
assert.match(versionHelp.stdout, /-p, --project-id <value>/);
assert.match(versionHelp.stdout, /--flow-id <value>/);

const flowUpdateRemarkHelp = runCli(['engage-flow', 'flow', 'update-remark', '--help']);
assert.equal(flowUpdateRemarkHelp.status, 0, flowUpdateRemarkHelp.stderr || flowUpdateRemarkHelp.stdout);
assert.match(flowUpdateRemarkHelp.stdout, /-p, --project-id <value>/);
assert.match(flowUpdateRemarkHelp.stdout, /--flow-uuid <value>/);
assert.match(flowUpdateRemarkHelp.stdout, /--flow-version-desc <value>/);

const flowHelp = runCli(['engage-flow', '--help']);
assert.equal(flowHelp.status, 0, flowHelp.stderr || flowHelp.stdout);
assert.match(flowHelp.stdout, /version/);
assert.match(flowHelp.stdout, /operation-log/);
assert.doesNotMatch(flowHelp.stdout, /\btest\b/);

const opLogHelp = runCli(['engage-flow', 'operation-log', 'query', '--help']);
assert.equal(opLogHelp.status, 0, opLogHelp.stderr || opLogHelp.stdout);
assert.match(opLogHelp.stdout, /--flow-id <value>/);
assert.doesNotMatch(opLogHelp.stdout, /--flow-uuid <value>/);

const testRunHelp = runCli(['engage-flow', 'test', 'run', '--help']);
assert.notEqual(testRunHelp.status, 0, 'engage-flow test run temporarily disabled');

const taskLogHelp = runCli(['engage-task', 'operation-log', 'query', '--help']);
assert.equal(taskLogHelp.status, 0, taskLogHelp.stderr || taskLogHelp.stdout);
assert.match(taskLogHelp.stdout, /--task-id <value>/);

const segmentDryRun = await captureCapabilityDryRun(segmentListQuery, {
  projectId: 1,
  taskId: 'task-1',
});
assert.equal(
  segmentDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-task.segment-list.query/dry-run`,
);
assert.deepEqual(segmentDryRun.body, {
  input: { project_id: 1, task_id: 'task-1' },
});

const taskDeleteDryRun = await captureCapabilityDryRun(taskDelete, {
  projectId: 1,
  taskId: 'task-1',
});
assert.equal(
  taskDeleteDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-task.task.delete/dry-run`,
);

const taskSubmitApprovalDryRun = await captureCapabilityDryRun(taskSubmitApproval, {
  projectId: 1,
  taskId: 'task-1',
});
assert.equal(
  taskSubmitApprovalDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-task.task.submit-approval/dry-run`,
);
assert.deepEqual(taskSubmitApprovalDryRun.body, {
  input: { project_id: 1, task_id: 'task-1' },
});
assert.throws(
  () => taskSubmitApproval.validate(makeCtx({ projectId: 1 })),
  /Exactly one of --task-id or --request is required/,
);
assert.throws(
  () => taskSubmitApproval.validate(makeCtx({
    projectId: 1,
    taskId: 'task-1',
    request: { taskName: 'legacy' },
  })),
  /Exactly one of --task-id or --request is required/,
);

const groupListDryRun = await captureCapabilityDryRun(groupList, {
  projectId: 1,
});
assert.equal(
  groupListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-task.group.list/dry-run`,
);

const taskHelp = runCli(['engage-task', '--help']);
assert.equal(taskHelp.status, 0, taskHelp.stderr || taskHelp.stdout);
assert.match(taskHelp.stdout, /segment-list/);
assert.match(taskHelp.stdout, /task/);
assert.match(taskHelp.stdout, /group/);
assert.match(taskHelp.stdout, /metric/);
assert.match(taskHelp.stdout, /channel-ref/);
assert.match(taskHelp.stdout, /race/);

const enabledHelps = [
  ['engage-task', 'group', 'delete', '--help'],
  ['engage-task', 'segment-list', 'set-visibility', '--help'],
  ['engage-task', 'race', 'release', '--help'],
  ['engage-task', 'task', 'submit-approval', '--help'],
];
for (const args of enabledHelps) {
  const enabled = runCli(args);
  assert.equal(enabled.status, 0, `expected enabled: ${args.join(' ')} -> ${enabled.stderr || enabled.stdout}`);
}
const approvalSubmitHelp = runCli(['engage-activity', 'approval', 'submit', '--help']);
assert.equal(approvalSubmitHelp.status, 0,
  `expected enabled: engage-activity approval submit --help -> ${approvalSubmitHelp.stderr || approvalSubmitHelp.stdout}`);

const validActivityContent = [{
  contentList: [{ pushLanguageCode: 'default', content: '[]' }],
}];
assert.doesNotThrow(() => activityTaskCreate.validate(makeCtx({
  payload: {
    triggerType: 0,
    triggerTime: '2026-07-30 10:00',
    triggerTimeStrategy: 'fixed_time_zone',
    tzOffset: 8,
    expConfig: { enableExp: false },
    groupContentList: validActivityContent,
  },
})));
assert.throws(
  () => activityTaskCreate.validate(makeCtx({
    payload: {
      triggerType: 3,
      triggerTimeStrategy: 'fixed_time_zone',
      tzOffset: 8,
      expConfig: { enableExp: true, expType: 2 },
      groupContentList: [validActivityContent[0], validActivityContent[0]],
    },
  })),
  (error) => error.code === 'ACTIVITY_TRIGGER_TYPE_UNSUPPORTED',
);
assert.throws(
  () => activityTaskCreate.validate(makeCtx({
    payload: {
      triggerType: 0,
      triggerTime: '2026-07-30 10:00',
      triggerTimeStrategy: 'fixed_time_zone',
      tzOffset: 8,
      expConfig: { enableExp: true, expType: 2 },
      groupContentList: validActivityContent,
    },
  })),
  (error) => error.code === 'ACTIVITY_EXPERIMENT_UNSUPPORTED',
);
assert.throws(
  () => activityTopicCreate.validate(makeCtx({
    payload: {
      triggerType: 0,
      triggerTime: '2026-07-30 10:00',
      tasks: [{
        taskName: 'task-1',
        clusterKey: 'cluster-1',
        groupContentList: validActivityContent,
      }],
    },
  })),
  (error) => error.code === 'TOPIC_TASK_OVERRIDE_UNSUPPORTED',
);

const settingHelp = runCli(['engage-setting', '--help']);
assert.equal(settingHelp.status, 0, settingHelp.stderr || settingHelp.stdout);
assert.match(settingHelp.stdout, /channel-touch-limits/);

// ---- 38 engage-setting capabilities: registration + help coverage ----
const engageSettingCommands = (await import('../../src/commands/te-engage/engage-setting/index.ts')).default;
const settingCapabilityIds = engageSettingCommands
  .map((cmd) => cmd.capabilityId)
  .filter((id) => typeof id === 'string' && id.startsWith('engage-setting.'));
const expectedSettingCapabilityIds = [
  'engage-setting.channel.update-config',
  'engage-setting.channel.test-send',
  'engage-setting.channel.list',
  'engage-setting.channel.get',
  'engage-setting.channel.create',
  'engage-setting.channel.update-status',
  'engage-setting.channel.delete',
  'engage-setting.channel-touch-limits.list',
  'engage-setting.channel-touch-limits.batch-update',
  'engage-setting.channel-touch-limits.toggle',
  'engage-setting.channel-touch-limits.save',
  'engage-setting.approval-approver.delete',
  'engage-setting.approval-approver.add',
  'engage-setting.approval-approver.list',
  'engage-setting.whitelist.list',
  'engage-setting.whitelist.add',
  'engage-setting.whitelist.update',
  'engage-setting.whitelist.delete',
  'engage-setting.whitelist.verify',
  'engage-setting.push-language.get',
  'engage-setting.push-language.set',
  'engage-setting.client-param.create',
  'engage-setting.client-param.update',
  'engage-setting.client-param.delete',
  'engage-setting.client-param.list',
  'engage-setting.config-table.upload',
  'engage-setting.config-table.save',
  'engage-setting.config-table.list',
  'engage-setting.config-table.query-data',
  'engage-setting.config-table.update-data',
  'engage-setting.config-table.delete',
  'engage-setting.preset-event.list',
  'engage-setting.preset-event.update',
  'engage-setting.common-metric.list',
  'engage-setting.common-metric.get',
  'engage-setting.common-metric.create',
  'engage-setting.common-metric.update',
  'engage-setting.common-metric.delete',
];
assert.equal(expectedSettingCapabilityIds.length, 38, 'expected 38 engage-setting capabilities');
const missingCapabilityIds = expectedSettingCapabilityIds.filter(
  (id) => !settingCapabilityIds.includes(id),
);
assert.equal(missingCapabilityIds.length, 0,
  `missing engage-setting capabilities: ${missingCapabilityIds.join(', ')}`);
assert.equal(settingCapabilityIds.length, 38,
  `expected exactly 38 engage-setting capabilities, got ${settingCapabilityIds.length}`);

// Each new command must surface in `engage-setting` help: resource in the top-level help,
// and each action under its resource subcommand help.
const settingHelpText = settingHelp.stdout;
const resourcesByCommand = new Map();
for (const cmd of engageSettingCommands) {
  if (!cmd.capabilityId || !cmd.capabilityId.startsWith('engage-setting.') || !cmd.resource) {
    continue;
  }
  if (!resourcesByCommand.has(cmd.resource)) {
    resourcesByCommand.set(cmd.resource, []);
  }
  resourcesByCommand.get(cmd.resource).push(cmd.command);
}
for (const resource of resourcesByCommand.keys()) {
  assert.ok(settingHelpText.includes(resource),
    `engage-setting --help missing resource: ${resource}`);
  const resourceHelp = runCli(['engage-setting', resource, '--help']);
  assert.equal(resourceHelp.status, 0,
    `engage-setting ${resource} --help -> ${resourceHelp.stderr || resourceHelp.stdout}`);
  for (const command of resourcesByCommand.get(resource)) {
    assert.ok(resourceHelp.stdout.includes(command),
      `engage-setting ${resource} --help missing command: ${command}`);
  }
}

// Sample a handful of new command --help screens to confirm flags render.
const settingFlagHelps = [
  ['engage-setting', 'whitelist', 'verify', '--help'],
  ['engage-setting', 'push-language', 'set', '--help'],
  ['engage-setting', 'client-param', 'create', '--help'],
  ['engage-setting', 'client-param', 'update', '--help'],
  ['engage-setting', 'config-table', 'upload', '--help'],
  ['engage-setting', 'preset-event', 'update', '--help'],
  ['engage-setting', 'common-metric', 'create', '--help'],
  ['engage-setting', 'common-metric', 'update', '--help'],
  ['engage-setting', 'approval-approver', 'delete', '--help'],
];
for (const args of settingFlagHelps) {
  const result = runCli(args);
  assert.equal(result.status, 0, `${args.join(' ')} -> ${result.stderr || result.stdout}`);
}

// Dry-run routing for a couple of new setting capabilities.
const whitelistVerifyDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-setting/whitelist/verify.ts')).whitelistVerify,
  { projectId: 1, propCode: '#account_id', columnType: 'string', whitelistPropList: '["v1"]' },
);
assert.equal(
  whitelistVerifyDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-setting.whitelist.verify/dry-run`,
);
assert.deepEqual(whitelistVerifyDryRun.body, {
  input: {
    project_id: 1,
    prop_code: '#account_id',
    column_type: 'string',
    whitelist_prop_list: ['v1'],
  },
});

const pushLanguageGetDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-setting/push-language/get.ts')).pushLanguageGet,
  { projectId: 1 },
);
assert.equal(
  pushLanguageGetDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-setting.push-language.get/dry-run`,
);
assert.deepEqual(pushLanguageGetDryRun.body, { input: { project_id: 1 } });

// ---- 42 engage-scene (场景管理/配置中心) L2 capabilities: registration + help coverage ----
const engageSceneCommands = (await import('../../src/commands/te-engage/engage-scene/index.ts')).default;
const sceneCapabilityIds = engageSceneCommands
  .map((cmd) => cmd.capabilityId)
  .filter((id) => typeof id === 'string' && id.startsWith('engage-scene.'));
const expectedSceneCapabilityIds = [
  'engage-scene.config-item.list',
  'engage-scene.config-item.get',
  'engage-scene.config-item.create',
  'engage-scene.config-item.update',
  'engage-scene.config-item.delete',
  'engage-scene.config-param.list',
  'engage-scene.config-param.batch-add',
  'engage-scene.config-param.update',
  'engage-scene.config-param.batch-delete',
  'engage-scene.config-group.list',
  'engage-scene.config-group.batch-add',
  'engage-scene.config-group.update',
  'engage-scene.config-group.batch-delete',
  'engage-scene.preset-metric.get',
  'engage-scene.preset-metric.set',
  'engage-scene.config-metric.list',
  'engage-scene.config-metric.get',
  'engage-scene.config-metric.batch-add',
  'engage-scene.config-metric.update-rule',
  'engage-scene.config-metric.batch-delete',
  'engage-scene.config-channel.list',
  'engage-scene.config-channel.get',
  'engage-scene.config-channel.create',
  'engage-scene.config-channel.update',
  'engage-scene.config-channel.update-status',
  'engage-scene.config-channel.delete',
  'engage-scene.config-channel.query-log',
  'engage-scene.strategy.create',
  'engage-scene.strategy.get',
  'engage-scene.strategy.list',
  'engage-scene.strategy.manage',
  'engage-scene.strategy.update',
  'engage-scene.strategy.log',
  'engage-scene.strategy.predict',
  'engage-scene.strategy.batch-copy',
  'engage-scene.template.list',
  'engage-scene.template.copy',
  'engage-scene.template.get',
  'engage-scene.template.create',
  'engage-scene.template.update',
  'engage-scene.template.update-status',
  'engage-scene.template.delete',
];
assert.equal(expectedSceneCapabilityIds.length, 42, 'expected 42 engage-scene L2 capabilities');
const missingSceneCapabilityIds = expectedSceneCapabilityIds.filter(
  (id) => !sceneCapabilityIds.includes(id),
);
assert.equal(missingSceneCapabilityIds.length, 0,
  `missing engage-scene capabilities: ${missingSceneCapabilityIds.join(', ')}`);
assert.equal(sceneCapabilityIds.length, 42,
  `expected exactly 42 engage-scene L2 capabilities, got ${sceneCapabilityIds.length}`);

const sceneHelp = runCli(['engage-scene', '--help']);
assert.equal(sceneHelp.status, 0, sceneHelp.stderr || sceneHelp.stdout);
const sceneHelpText = sceneHelp.stdout;
const sceneResourcesByCommand = new Map();
for (const cmd of engageSceneCommands) {
  if (!cmd.capabilityId || !cmd.capabilityId.startsWith('engage-scene.') || !cmd.resource) {
    continue;
  }
  if (!sceneResourcesByCommand.has(cmd.resource)) {
    sceneResourcesByCommand.set(cmd.resource, []);
  }
  sceneResourcesByCommand.get(cmd.resource).push(cmd.command);
}
for (const resource of sceneResourcesByCommand.keys()) {
  assert.ok(sceneHelpText.includes(resource),
    `engage-scene --help missing resource: ${resource}`);
  const resourceHelp = runCli(['engage-scene', resource, '--help']);
  assert.equal(resourceHelp.status, 0,
    `engage-scene ${resource} --help -> ${resourceHelp.stderr || resourceHelp.stdout}`);
  for (const command of sceneResourcesByCommand.get(resource)) {
    assert.ok(resourceHelp.stdout.includes(command),
      `engage-scene ${resource} --help missing command: ${command}`);
  }
}

// Dry-run routing for a few engage-scene capabilities.
const configParamListDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-scene/config-param/list.ts')).configParamList,
  { projectId: 1, configId: 'cfg-1' },
);
assert.equal(
  configParamListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-scene.config-param.list/dry-run`,
);
assert.deepEqual(configParamListDryRun.body, {
  input: { project_id: 1, config_id: 'cfg-1' },
});

const strategyLogDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-scene/strategy/log.ts')).strategyLog,
  { projectId: 1, strategyUuid: 'uuid-1' },
);
assert.equal(
  strategyLogDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-scene.strategy.log/dry-run`,
);
assert.deepEqual(strategyLogDryRun.body, {
  input: { project_id: 1, strategy_uuid: 'uuid-1' },
});

const templateListDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-scene/template/list.ts')).templateList,
  { projectId: 1, configId: 'cfg-1' },
);
assert.equal(
  templateListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-scene.template.list/dry-run`,
);
assert.deepEqual(templateListDryRun.body, {
  input: { project_id: 1, config_id: 'cfg-1' },
});

const strategyListDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-scene/strategy/list.ts')).strategyList,
  { projectId: 1, configId: 'cfg-1', strategyUuidList: ['uuid-1'] },
);
assert.equal(
  strategyListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-scene.strategy.list/dry-run`,
);
assert.deepEqual(strategyListDryRun.body, {
  input: { project_id: 1, config_id: 'cfg-1', strategy_uuid_list: ['uuid-1'] },
});

const configItemDeleteDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-scene/config-item/delete.ts')).configItemDelete,
  { projectId: 1, configId: 'cfg-1', openId: 'ou-1' },
);
assert.equal(
  configItemDeleteDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-scene.config-item.delete/dry-run`,
);
assert.deepEqual(configItemDeleteDryRun.body, {
  input: { project_id: 1, config_id: 'cfg-1', open_id: 'ou-1' },
});

const removedConfigCommand = runCli(['engage', '+config_item_list', '--help']);
assert.notEqual(removedConfigCommand.status, 0,
  'legacy +config_item_list must no longer be registered');

// ---- 26 engage-activity (运营活动) capabilities: registration + help coverage ----
const engageActivityCommands = (await import('../../src/commands/te-engage/engage-activity/index.ts')).default;
const activityCapabilityIds = engageActivityCommands
  .map((cmd) => cmd.capabilityId)
  .filter((id) => typeof id === 'string' && id.startsWith('engage-activity.'));
const expectedActivityCapabilityIds = [
  'engage-activity.activity.create',
  'engage-activity.activity.update',
  'engage-activity.activity.delete',
  'engage-activity.activity.list',
  'engage-activity.activity.get',
  'engage-activity.activity.pause',
  'engage-activity.activity.end',
  'engage-activity.activity.stats',
  'engage-activity.activity.info-list',
  'engage-activity.approval.submit',
  'engage-activity.approval.approve',
  'engage-activity.approval.reject',
  'engage-activity.approval.cancel',
  'engage-activity.topic.create',
  'engage-activity.topic.update',
  'engage-activity.topic.remove-task',
  'engage-activity.topic.delete',
  'engage-activity.topic.get',
  'engage-activity.topic.copy',
  'engage-activity.activity-type.list',
  'engage-activity.activity-type.batch-add',
  'engage-activity.activity-type.update',
  'engage-activity.activity-type.batch-delete',
  'engage-activity.task.get',
  'engage-activity.task.create',
  'engage-activity.task.update',
  'engage-activity.task.copy',
];
assert.equal(expectedActivityCapabilityIds.length, 27, 'expected 27 engage-activity capabilities');
const missingActivityCapabilityIds = expectedActivityCapabilityIds.filter(
  (id) => !activityCapabilityIds.includes(id),
);
assert.equal(missingActivityCapabilityIds.length, 0,
  `missing engage-activity capabilities: ${missingActivityCapabilityIds.join(', ')}`);
assert.equal(activityCapabilityIds.length, 27,
  `expected exactly 27 engage-activity capabilities, got ${activityCapabilityIds.length}`);

const activityHelp = runCli(['engage-activity', '--help']);
assert.equal(activityHelp.status, 0, activityHelp.stderr || activityHelp.stdout);
const activityHelpText = activityHelp.stdout;
const activityResourcesByCommand = new Map();
for (const cmd of engageActivityCommands) {
  if (!cmd.capabilityId || !cmd.capabilityId.startsWith('engage-activity.') || !cmd.resource) {
    continue;
  }
  if (!activityResourcesByCommand.has(cmd.resource)) {
    activityResourcesByCommand.set(cmd.resource, []);
  }
  activityResourcesByCommand.get(cmd.resource).push(cmd.command);
}
for (const resource of activityResourcesByCommand.keys()) {
  assert.ok(activityHelpText.includes(resource),
    `engage-activity --help missing resource: ${resource}`);
  const resourceHelp = runCli(['engage-activity', resource, '--help']);
  assert.equal(resourceHelp.status, 0,
    `engage-activity ${resource} --help -> ${resourceHelp.stderr || resourceHelp.stdout}`);
  for (const command of activityResourcesByCommand.get(resource)) {
    assert.ok(resourceHelp.stdout.includes(command),
      `engage-activity ${resource} --help missing command: ${command}`);
  }
}

// Dry-run routing for a few engage-activity capabilities.
const activityListDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-activity/activity/list.ts')).activityList,
  { projectId: 1, page: 1, pageSize: 20 },
);
assert.equal(
  activityListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-activity.activity.list/dry-run`,
);
assert.deepEqual(activityListDryRun.body, {
  input: { project_id: 1, page: 1, page_size: 20 },
});

const activityGetDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-activity/activity/get.ts')).activityGet,
  { projectId: 1, activityId: 'act-1' },
);
assert.equal(
  activityGetDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-activity.activity.get/dry-run`,
);
assert.deepEqual(activityGetDryRun.body, {
  input: { project_id: 1, activity_id: 'act-1' },
});

const activityTypeListDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-activity/activity-type/list.ts')).activityTypeList,
  { projectId: 1 },
);
assert.equal(
  activityTypeListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-activity.activity-type.list/dry-run`,
);
assert.deepEqual(activityTypeListDryRun.body, { input: { project_id: 1 } });

const taskGetDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-activity/task/get.ts')).taskGet,
  { projectId: 1, taskId: 'task-1' },
);
assert.equal(
  taskGetDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-activity.task.get/dry-run`,
);
assert.deepEqual(taskGetDryRun.body, {
  input: { project_id: 1, task_id: 'task-1' },
});

// ---- 4 engage-workbench (工作台) capabilities: registration + help coverage ----
const engageWorkbenchCommands = (await import('../../src/commands/te-engage/engage-workbench/index.ts')).default;
const workbenchCapabilityIds = engageWorkbenchCommands
  .map((cmd) => cmd.capabilityId)
  .filter((id) => typeof id === 'string' && id.startsWith('engage-workbench.'));
const expectedWorkbenchCapabilityIds = [
  'engage-workbench.workbench.list',
  'engage-workbench.workbench.add',
  'engage-workbench.workbench.update',
  'engage-workbench.workbench.delete',
];
assert.equal(expectedWorkbenchCapabilityIds.length, 4, 'expected 4 engage-workbench capabilities');
const missingWorkbenchCapabilityIds = expectedWorkbenchCapabilityIds.filter(
  (id) => !workbenchCapabilityIds.includes(id),
);
assert.equal(missingWorkbenchCapabilityIds.length, 0,
  `missing engage-workbench capabilities: ${missingWorkbenchCapabilityIds.join(', ')}`);
assert.equal(workbenchCapabilityIds.length, 4,
  `expected exactly 4 engage-workbench capabilities, got ${workbenchCapabilityIds.length}`);

const workbenchHelp = runCli(['engage-workbench', '--help']);
assert.equal(workbenchHelp.status, 0, workbenchHelp.stderr || workbenchHelp.stdout);
const workbenchHelpText = workbenchHelp.stdout;
const workbenchResourcesByCommand = new Map();
for (const cmd of engageWorkbenchCommands) {
  if (!cmd.capabilityId || !cmd.capabilityId.startsWith('engage-workbench.') || !cmd.resource) {
    continue;
  }
  if (!workbenchResourcesByCommand.has(cmd.resource)) {
    workbenchResourcesByCommand.set(cmd.resource, []);
  }
  workbenchResourcesByCommand.get(cmd.resource).push(cmd.command);
}
for (const resource of workbenchResourcesByCommand.keys()) {
  assert.ok(workbenchHelpText.includes(resource),
    `engage-workbench --help missing resource: ${resource}`);
  const resourceHelp = runCli(['engage-workbench', resource, '--help']);
  assert.equal(resourceHelp.status, 0,
    `engage-workbench ${resource} --help -> ${resourceHelp.stderr || resourceHelp.stdout}`);
  for (const command of workbenchResourcesByCommand.get(resource)) {
    assert.ok(resourceHelp.stdout.includes(command),
      `engage-workbench ${resource} --help missing command: ${command}`);
  }
}

// Dry-run routing for engage-workbench capabilities.
const workbenchListDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-workbench/workbench/list.ts')).workbenchList,
  { projectId: 1 },
);
assert.equal(
  workbenchListDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-workbench.workbench.list/dry-run`,
);
assert.deepEqual(workbenchListDryRun.body, { input: { project_id: 1 } });

const workbenchAddDryRun = await captureCapabilityDryRun(
  (await import('../../src/commands/te-engage/engage-workbench/workbench/add.ts')).workbenchAdd,
  { projectId: 1, metricType: 5, dateType: 8, orderId: 1 },
);
assert.equal(
  workbenchAddDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-workbench.workbench.add/dry-run`,
);
assert.deepEqual(workbenchAddDryRun.body, {
  input: { project_id: 1, metric_type: 5, date_type: 8, order_id: 1 },
});

process.stdout.write('engage capability command contract: OK\n');
