import assert from 'node:assert/strict';
import {
  resourcePackageCommands, reviewPreflight,
} from '../src/commands/te-agent/resource-packages.ts';
import type { RuntimeContext } from '../src/framework/types.ts';

function context(values: Record<string, unknown> = {}): RuntimeContext {
  return {
    has: (key: string) => Object.prototype.hasOwnProperty.call(values, key),
    str: (key: string) => typeof values[key] === 'string' ? String(values[key]) : '',
    num: (key: string) => Number(values[key] ?? 0),
    optionalNum: (key: string) => values[key] === undefined ? undefined : Number(values[key]),
    bool: (key: string) => Boolean(values[key]),
    json: (key: string) => values[key],
    list: () => [],
    host: () => 'https://resource-package.test',
  } as RuntimeContext;
}

assert.deepEqual(resourcePackageCommands.map((command) => `${command.resource} ${command.command}`), [
  'resource-package list', 'resource-package show', 'resource-package export-preview',
  'resource-package export', 'resource-package import', 'resource-package download',
  'resource-package cancel', 'resource-package retry',
]);
assert.deepEqual(resourcePackageCommands.map((command) => command.risk), [
  'read', 'read', 'read', 'write', 'write', 'read', 'high-risk-write', 'write',
]);

const [list, , preview, exportCommand, importCommand] = resourcePackageCommands;
const listCtx = context({ kind: 'export', scope: 'company', status: 'failed', page: 2, pageSize: 50 });
assert.deepEqual(await list.dryRun?.(listCtx), {
  method: 'GET',
  url: '/api/resource-packages/tasks?kind=export&scope=company&status=failed&page=2&pageSize=50',
});
const previewCtx = context({ roots: '[{"type":"agent","sourceId":"agent-1"}]' });
preview.validate?.(previewCtx);
assert.deepEqual(await preview.dryRun?.(previewCtx), {
  method: 'POST', url: '/api/resource-packages/exports/preview',
  body: { roots: [{ type: 'agent', sourceId: 'agent-1' }] },
});
const exportCtx = context({
  scope: 'personal', roots: '[{"type":"skill","sourceId":"skill-1"}]',
  requestKey: 'request-1', noWait: true,
});
exportCommand.validate?.(exportCtx);
assert.deepEqual(await exportCommand.dryRun?.(exportCtx), {
  method: 'POST', url: '/api/resource-packages/tasks',
  body: { requestKey: 'request-1', kind: 'export', scope: 'personal', payload: {
    roots: [{ type: 'skill', sourceId: 'skill-1' }], excluded: [],
  } },
});
const importCtx = context({ file: './resources.zip', scope: 'company', noWait: true });
importCommand.validate?.(importCtx);
assert.deepEqual(await importCommand.dryRun?.(importCtx), {
  method: 'WORKFLOW', url: '/api/resource-packages/uploads',
  body: { file: './resources.zip', scope: 'company', resume: true, wait: false },
});
assert.throws(() => exportCommand.validate?.(context({
  scope: 'personal', roots: '[{"type":"unknown","sourceId":"x"}]', noWait: true,
})), /roots/);
assert.throws(() => importCommand.validate?.(context({ file: './resources.zip', scope: 'all' })), /scope/);
assert.throws(() => exportCommand.validate?.(context({
  scope: 'personal', roots: '[{"type":"skill","sourceId":"skill-1"}]', noWait: true,
  output: './resources.zip',
})), /no-wait/);

const preflight = {
  snapshotId: 'snapshot', status: 'blocked' as const, warnings: [], confirmations: [],
  blockers: [
    { code: 'CORE_SYSTEM_AGENT_UNRESOLVED', message: 'missing', referenceKey: 'system:a',
      replacementCandidates: [{ id: 'allowed' }] },
    { code: 'APP_VERSION_MISMATCH', message: 'incompatible', referenceKey: 'system:b' },
  ],
};
assert.equal(reviewPreflight(preflight, { 'system:a': 'allowed', 'system:b': 'anything' }, [])
  .unresolvedBlockers.length, 1);
assert.equal(reviewPreflight(preflight, { 'system:a': 'not-a-candidate' }, [])
  .unresolvedBlockers.length, 2);

process.stdout.write('resource package command tests passed\n');
