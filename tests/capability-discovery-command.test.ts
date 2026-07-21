/**
 * capability discovery command helper tests
 *
 * Run:
 *   npx tsx tests/capability-discovery-command.test.ts
 */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { registerCapability } from '../src/commands/capability/index.ts';
import {
  filterCapabilities,
  normalizeCapabilityList,
  parseCapabilityInput,
  parseOptionalProjectId,
  resolveCapabilityGatewayDomain,
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
    writeFileSync(file, '{"event_name":"login"}');
    assert.equal(JSON.stringify(parseCapabilityInput(file)), '{"event_name":"login"}');
    assert.equal(JSON.stringify(parseCapabilityInput(`@${file}`)), '{"event_name":"login"}');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('parseCapabilityInput rejects non-object JSON', () => {
  assert.throws(
    () => parseCapabilityInput('[1,2,3]'),
    /Capability input must be a JSON object/,
  );
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
