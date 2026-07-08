/**
 * capability-command + capability-routing unit tests
 *
 * Run: npx tsx tests/capability-command.test.ts
 */

import assert from 'node:assert/strict';
import { createCapabilityCommand } from '../src/core/capability-command.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
  resolveGatewayDomain,
} from '../src/core/capability-routing.ts';

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

function makeCtx(host = 'https://ta.example.com') {
  return {
    host: () => host,
    str: () => '',
    num: () => 1,
    bool: () => false,
    json: () => ({}),
  } as any;
}

process.stdout.write('\ncapability-command tests\n');

await test('resolveGatewayDomain uses registered cliService route', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });
  assert.equal(resolveGatewayDomain('metadata'), 'analysis');
});

await test('resolveGatewayDomain honors explicit override', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });
  assert.equal(resolveGatewayDomain('metadata', 'custom'), 'custom');
});

await test('resolveGatewayDomain throws when cliService is not registered', () => {
  clearCapabilityGatewayRoutesForTest();
  assert.throws(
    () => resolveGatewayDomain('unknown'),
    /not registered for CLI service 'unknown'/,
  );
});

await test('createCapabilityCommand dry-run targets gateway component not cliService', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });

  const cmd = createCapabilityCommand({
    cliService: 'metadata',
    resource: 'event',
    command: 'get',
    capabilityId: 'metadata.event.get',
    description: 'test',
    flags: [],
    risk: 'read',
    buildInput: () => ({ project_id: 1, event_name: 'login' }),
  });

  const dryRun = cmd.dryRun!(makeCtx());
  assert.equal(
    dryRun.url,
    'https://ta.example.com/api/cli/analysis/v1/capabilities/metadata.event.get/dry-run',
  );
  assert.deepEqual(dryRun.body, {
    input: { project_id: 1, event_name: 'login' },
  });
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
