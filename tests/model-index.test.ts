/**
 * model command helper unit tests
 *
 * Run:
 *   npx tsx tests/model-index.test.ts
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractModelIdHeader, readCurrentModelSelection } from '../src/commands/model/index.ts';

let pass = 0;
let fail = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

const tmpRoot = mkdtempSync(join(tmpdir(), 'ae-cli-model-index-'));
const prevClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
process.env.CLAUDE_CONFIG_DIR = tmpRoot;
process.stdout.write(`tmp: ${tmpRoot}\n`);

try {
  test('extractModelIdHeader parses model-id header', () => {
    assert.equal(
      extractModelIdHeader('x-trace-workspace-id: wp-1\nmodel-id: model-row-id\nopen_id: u-1'),
      'model-row-id',
    );
  });

  test('readCurrentModelSelection prefers Model.id from custom headers', () => {
    writeFileSync(
      join(tmpRoot, 'settings.json'),
      JSON.stringify(
        {
          model: 'provider-model-id',
          env: {
            ANTHROPIC_MODEL: 'provider-model-id',
            ANTHROPIC_CUSTOM_HEADERS:
              'x-trace-workspace-id: wp-1\nmodel-id: model-table-id\nopen_id: u-1',
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    assert.deepEqual(readCurrentModelSelection(), {
      routingModelId: 'model-table-id',
      providerModelId: 'provider-model-id',
    });
  });

  test('readCurrentModelSelection falls back to env provider model', () => {
    mkdirSync(tmpRoot, { recursive: true });
    writeFileSync(
      join(tmpRoot, 'settings.json'),
      JSON.stringify(
        {
          env: {
            ANTHROPIC_MODEL: 'system-provider-model-id',
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    assert.deepEqual(readCurrentModelSelection(), {
      routingModelId: null,
      providerModelId: 'system-provider-model-id',
    });
  });

  test('readCurrentModelSelection tolerates missing settings', () => {
    const missingDir = join(tmpRoot, 'missing');
    process.env.CLAUDE_CONFIG_DIR = missingDir;
    assert.deepEqual(readCurrentModelSelection(), {
      routingModelId: null,
      providerModelId: null,
    });
  });
} finally {
  if (prevClaudeConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = prevClaudeConfigDir;
  rmSync(tmpRoot, { recursive: true, force: true });
}

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
