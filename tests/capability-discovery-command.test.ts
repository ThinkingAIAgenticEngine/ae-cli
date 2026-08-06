/**
 * capability discovery command helper tests
 *
 * Run:
 *   npx tsx tests/capability-discovery-command.test.ts
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { registerCapability } from '../src/commands/capability/index.ts';
import '../src/commands/te-analysis/index.ts';
import {
  CapabilityCommandValidationError,
  filterCapabilities,
  normalizeCapabilityList,
  parseCapabilityInput,
  parseOptionalProjectId,
  resolveCapabilityGatewayDomain,
  resolveCapabilityListDomain,
} from '../src/commands/capability/helpers.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../src/core/capability-routing.ts';

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (error) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

process.stdout.write('\ncapability discovery command tests\n');

await test('registerCapability exposes the six discovery and invocation commands', () => {
  const program = new Command();
  registerCapability(program);
  const capability = program.commands.find((command) => command.name() === 'capability');
  assert.ok(capability);
  assert.deepEqual(
    capability.commands.map((command) => command.name()),
    ['list', 'search', 'inspect', 'validate', 'dry-run', 'run'],
  );
  for (const commandName of ['list', 'search', 'inspect']) {
    const command = capability.commands.find((candidate) => candidate.name() === commandName);
    assert.ok(command?.options.some((option) => option.long === '--project-id'));
  }
});

await test('system and project namespaces default to the analysis gateway', () => {
  assert.equal(resolveCapabilityListDomain('system'), 'analysis');
  assert.equal(resolveCapabilityListDomain('project'), 'analysis');
  for (const capabilityId of [
    'system.member.add',
    'system.member_password.reset',
    'system.password_policy.get',
    'system.password_policy.update',
    'system.watermark.get',
    'system.watermark.update',
  ]) {
    assert.equal(resolveCapabilityGatewayDomain(capabilityId), 'analysis');
  }
  assert.equal(resolveCapabilityGatewayDomain('project.info.list'), 'analysis');
});

await test('generic capability routing honors an empty env override for the root gateway', () => {
  process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN = '';
  try {
    assert.equal(resolveCapabilityListDomain('system'), '');
    assert.equal(resolveCapabilityGatewayDomain('system.member.list'), '');
    assert.equal(resolveCapabilityGatewayDomain('project.info.list'), '');
    assert.equal(resolveCapabilityGatewayDomain('unregistered.example.list'), '');
  } finally {
    delete process.env.AE_CLI_CAPABILITY_GATEWAY_DOMAIN;
  }
});

await test('resolveCapabilityGatewayDomain uses a registered CLI domain route', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('metadata', { gatewayDomain: 'analysis' });
  assert.equal(resolveCapabilityGatewayDomain('metadata.event.get'), 'analysis');
});

await test('resolveCapabilityGatewayDomain falls back to the capability namespace', () => {
  clearCapabilityGatewayRoutesForTest();
  assert.equal(resolveCapabilityGatewayDomain('engage.flow.list'), 'engage');
});

await test('parseOptionalProjectId accepts positive safe integers and rejects invalid values', () => {
  assert.equal(parseOptionalProjectId(undefined), undefined);
  assert.equal(parseOptionalProjectId(' 42 '), 42);
  for (const value of ['', '0', '-1', '1.5', 'abc', '9007199254740992']) {
    assert.throws(() => parseOptionalProjectId(value), /--project-id/);
  }
});

await test('filterCapabilities limits results to the namespace and all search terms', () => {
  const catalog = normalizeCapabilityList([
    { id: 'analysis.report.list', description: 'List saved reports' },
    { id: 'analysis.report.get', description: 'Get one saved report' },
    { id: 'metadata.report.list', description: 'List metadata reports' },
    { description: 'Missing ID is ignored' },
  ]);

  assert.deepEqual(
    filterCapabilities(catalog, 'analysis', 'report list').map((item) => item.id),
    ['analysis.report.list'],
  );
});

await test('parseCapabilityInput accepts inline JSON and JSON files', () => {
  assert.equal(JSON.stringify(parseCapabilityInput('{"project_id":1}')), '{"project_id":1}');

  const dir = mkdtempSync(join(tmpdir(), 'ae-cli-capability-'));
  const file = join(dir, 'input.json');
  try {
    const encryptedPassword = `RSA/6.0+${'AbCdEf0123456789+/'.repeat(32)}==`;
    const payload = {
      company_id: 7,
      members: [
        { account: 'alice@example.com', role_ids: [1, 2] },
        { account: 'bob@example.com', role_ids: [3] },
      ],
      encrypted_password: encryptedPassword,
    };
    writeFileSync(file, JSON.stringify(payload));
    assert.equal(JSON.stringify(parseCapabilityInput(file)), JSON.stringify(payload));
    assert.equal(JSON.stringify(parseCapabilityInput(`@${file}`)), JSON.stringify(payload));
    assert.equal(JSON.stringify(parseCapabilityInput(JSON.stringify(payload))), JSON.stringify(payload));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('parseCapabilityInput reads complex system input from stdin without changing ciphertext', () => {
  const encryptedPassword = `RSA/6.0+${'0123456789AbCdEf+/'.repeat(32)}==`;
  const payload = {
    company_id: 7,
    members: [{ account: 'alice@example.com', project_ids: [11, 12] }],
    encrypted_password: encryptedPassword,
  };
  const helperUrl = new URL('../src/commands/capability/helpers.ts', import.meta.url).href;
  const script = [
    `import { parseCapabilityInput } from ${JSON.stringify(helperUrl)};`,
    "process.stdout.write(JSON.stringify(parseCapabilityInput('-')));",
  ].join('\n');
  const child = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', script],
    {
      input: JSON.stringify(payload),
      encoding: 'utf8',
    },
  );

  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), payload);
});

await test('parseCapabilityInput rejects non-object JSON', () => {
  assert.throws(
    () => parseCapabilityInput('[1,2,3]'),
    /Capability input must be a JSON object/,
  );
});

await test('parseCapabilityInput rejects non-canonical projectId without mapping it', () => {
  for (const input of ['{"projectId":1}', '{"projectId":1,"project_id":2}']) {
    assert.throws(
      () => parseCapabilityInput(input),
      (error: unknown) => error instanceof CapabilityCommandValidationError
        && error.code === 'UNSUPPORTED_INPUT_FIELDS'
        && error.hint === 'Use the canonical snake_case field project_id.',
    );
  }
  assert.equal(parseCapabilityInput('{"project_id":1}').project_id, 1);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
