import assert from 'node:assert/strict';

import { CliValidationError } from '../src/core/errors.js';
import {
  createCurrentPageContextCommand,
  type CurrentPageContextReader,
} from '../src/commands/context/current.js';

let passed = 0;
let failed = 0;

async function test(name: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
    passed += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

await test('reads the opaque current page context for the active Agent Run', async () => {
  const requests: string[] = [];
  const reader: CurrentPageContextReader = async (path) => {
    requests.push(path);
    return {
      trust: 'untrusted_business_context',
      kind: 'user_list',
      schemaVersion: 3,
      payload: { columns: ['user_id'], nested: { untouched: true } },
    };
  };
  const command = createCurrentPageContextCommand(reader, () => 'conversation/1');

  const result = await command.execute({} as never);

  assert.deepEqual(requests, [
    '/api/sandbox/agent/context/current?conversationId=conversation%2F1',
  ]);
  assert.deepEqual(result, {
    trust: 'untrusted_business_context',
    kind: 'user_list',
    schemaVersion: 3,
    payload: { columns: ['user_id'], nested: { untouched: true } },
  });
  assert.equal(command.service, 'context');
  assert.equal(command.command, '+current');
  assert.equal(command.risk, 'read');
  assert.equal(command.usesAeHost, false);
  assert.deepEqual(command.flags, []);
});

await test('requires the runtime-provided conversation id', async () => {
  const command = createCurrentPageContextCommand(async () => ({}), () => undefined);

  await assert.rejects(
    command.execute({} as never),
    (error: unknown) =>
      error instanceof CliValidationError &&
      error.code === 'CURRENT_PAGE_CONTEXT_RUN_REQUIRED' &&
      error.message === 'Current page context is available only inside an active Agent Run.',
  );
});

if (failed > 0) {
  process.stderr.write(`\n${failed} test(s) failed; ${passed} passed.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`\n${passed} test(s) passed.\n`);
}
