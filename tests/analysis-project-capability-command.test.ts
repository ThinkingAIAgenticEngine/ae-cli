/**
 * analysis project capability command unit tests
 *
 * Run: npx tsx tests/analysis-project-capability-command.test.ts
 */

import assert from 'node:assert/strict';
import type { RuntimeContext } from '../src/framework/types.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { CliValidationError } from '../src/core/errors.ts';
import { projectPermissionBindingList } from '../src/commands/te-analysis/project/permission-binding/list.ts';
import { projectRoleDelete } from '../src/commands/te-analysis/project/role/delete.ts';
import { projectRoleGet } from '../src/commands/te-analysis/project/role/get.ts';
import { projectRoleUserList } from '../src/commands/te-analysis/project/role-user/list.ts';
import { projectTimezoneUpdate } from '../src/commands/te-analysis/project/timezone/update.ts';
import projectCommands from '../src/commands/te-analysis/project/index.ts';

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    str(name: string): string {
      const value = values[name];
      return value === undefined || value === null ? '' : String(value);
    },
    num(name: string): number {
      return Number(values[name]);
    },
    bool(name: string): boolean {
      return Boolean(values[name]);
    },
    json(name: string): unknown {
      const value = values[name];
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    api: async () => ({}),
    querySql: async () => ({}),
    queryReportData: async () => ({}),
    token: async () => 'token',
    host: () => 'https://ta.example.com',
    mcpUrl: () => undefined,
    service: () => 'analysis',
    out: () => undefined,
  };
}

async function dryInput(
  command: { dryRun?: (ctx: RuntimeContext) => unknown },
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  const host = 'https://ta.example.com';
  setCliTokenManual('analysis-project-contract-test-token', host);
  let body: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_request: any, init?: RequestInit) => {
    body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;
  try {
    await command.dryRun!(ctx(input));
    return body.input;
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
}

process.stdout.write('\nanalysis project capability command tests\n');

await test('all project commands map their three-part capability ID directly to the CLI path', () => {
  for (const command of projectCommands) {
    const [, resource, action] = command.capabilityId!.split('.');
    assert.equal(command.service, 'project');
    assert.equal(command.resource, resource.replaceAll('_', '-'));
    assert.equal(command.command, action.replaceAll('_', '-'));
  }
});

await test('project role get forwards project_id', async () => {
  assert.deepEqual(await dryInput(projectRoleGet, {
    'project-id': 1,
    'role-name': 'custom_role',
  }), {
    project_id: 1,
    role_name: 'custom_role',
  });
});

await test('project role delete forwards project_id', async () => {
  assert.deepEqual(await dryInput(projectRoleDelete, {
    'project-id': 1,
    'role-name': 'custom_role',
    'new-role-name': 'viewer',
  }), {
    project_id: 1,
    role_name: 'custom_role',
    new_role_name: 'viewer',
    yes: true,
  });
});

await test('project role-user list forwards project_id', async () => {
  assert.deepEqual(await dryInput(projectRoleUserList, {
    'project-id': 1,
    'role-name': 'custom_role',
  }), {
    project_id: 1,
    role_name: 'custom_role',
  });
});

await test('project permission-binding list forwards project_id', async () => {
  assert.deepEqual(await dryInput(projectPermissionBindingList, {
    'project-id': 1,
    'company-id': 1,
    'project-ids': '[1]',
  }), {
    project_id: 1,
    company_id: 1,
    project_ids: [1],
  });
});

await test('project timezone update forwards the item-specific toggle payload', async () => {
  assert.deepEqual(await dryInput(projectTimezoneUpdate, {
    'project-id': 606,
    item: 'timezone_toggle',
    payload: '{"toggle":true}',
  }), {
    project_id: 606,
    item: 'timezone_toggle',
    payload: { toggle: true },
  });
});

await test('project timezone update rejects response-only toggle fields before dispatch', async () => {
  await assert.rejects(
    () => dryInput(projectTimezoneUpdate, {
      'project-id': 606,
      item: 'timezone_toggle',
      payload: '{"time_zone_enabled":true}',
    }),
    (error: unknown) => error instanceof CliValidationError
      && error.code === 'INVALID_TIMEZONE_PAYLOAD'
      && /requires boolean field toggle/.test(error.message),
  );
});

if (fail > 0) {
  process.exitCode = 1;
}
