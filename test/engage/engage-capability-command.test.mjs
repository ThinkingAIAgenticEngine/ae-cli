import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { channelTouchLimitsList } from '../../src/commands/te-engage/engage-setting/channel-touch-limits/list.ts';
import { operationLogQuery } from '../../src/commands/te-engage/engage-flow/operation-log/query.ts';
import { operationLogQuery as taskOperationLogQuery } from '../../src/commands/te-engage/engage-task/operation-log/query.ts';
import { segmentListQuery } from '../../src/commands/te-engage/engage-task/segment-list/query.ts';
import { opsDelete } from '../../src/commands/te-engage/engage-task/ops/delete.ts';
import { groupList } from '../../src/commands/te-engage/engage-task/group/list.ts';
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

const opLogDryRun = await captureCapabilityDryRun(operationLogQuery, {
  projectId: 1,
  flowUuid: 'flow_uuid_123',
});
assert.equal(
  opLogDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-flow.operation-log.query/dry-run`,
);
assert.deepEqual(opLogDryRun.body, {
  input: { project_id: 1, flow_uuid: 'flow_uuid_123' },
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

const help = runCli(['engage-setting', 'channel-touch-limits', 'list', '--help']);
assert.equal(help.status, 0, help.stderr || help.stdout);
assert.match(help.stdout, /-p, --project-id <value>/);

const versionHelp = runCli(['engage-flow', 'version', 'list', '--help']);
assert.equal(versionHelp.status, 0, versionHelp.stderr || versionHelp.stdout);
assert.match(versionHelp.stdout, /-p, --project-id <value>/);
assert.match(versionHelp.stdout, /--flow-id <value>/);

const flowHelp = runCli(['engage-flow', '--help']);
assert.equal(flowHelp.status, 0, flowHelp.stderr || flowHelp.stdout);
assert.match(flowHelp.stdout, /version/);
assert.match(flowHelp.stdout, /operation-log/);
assert.doesNotMatch(flowHelp.stdout, /engage-flow test|^\s+test\s*$/m);

const opLogHelp = runCli(['engage-flow', 'operation-log', 'query', '--help']);
assert.equal(opLogHelp.status, 0, opLogHelp.stderr || opLogHelp.stdout);
assert.match(opLogHelp.stdout, /--flow-uuid <value>/);

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

const opsDeleteDryRun = await captureCapabilityDryRun(opsDelete, {
  projectId: 1,
  taskId: 'task-1',
});
assert.equal(
  opsDeleteDryRun.url,
  `${HOST}/api/cli/engage/v1/capabilities/engage-task.ops.delete/dry-run`,
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
assert.match(taskHelp.stdout, /ops/);
assert.match(taskHelp.stdout, /group/);
assert.match(taskHelp.stdout, /metric/);
assert.match(taskHelp.stdout, /channel-ref/);
assert.doesNotMatch(taskHelp.stdout, /^\s+race\s+/m);

const raceHelp = runCli(['engage-task', 'race', '--help']);
assert.notEqual(raceHelp.status, 0);

const disabledHelps = [
  ['engage-task', 'group', 'delete', '--help'],
  ['engage-task', 'segment-list', 'set-visibility', '--help'],
  ['engage-task', 'ops', 'submit-approval', '--help'],
  ['engage-task', 'race', 'release', '--help'],
];
for (const args of disabledHelps) {
  const disabled = runCli(args);
  assert.notEqual(disabled.status, 0, `expected disabled: ${args.join(' ')}`);
}

const settingHelp = runCli(['engage-setting', '--help']);
assert.equal(settingHelp.status, 0, settingHelp.stderr || settingHelp.stdout);
assert.match(settingHelp.stdout, /channel-touch-limits/);

process.stdout.write('engage capability command contract: OK\n');
