import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { CliValidationError } from '../src/core/errors.ts';
import type { RuntimeContext } from '../src/framework/types.ts';
import {
  readSkillAsset,
  readSkillReference,
  readSkillScript,
  uploadSkillReference,
} from '../src/commands/te-agent/skill-content.ts';

function context(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => (values[name] === undefined ? undefined : Number(values[name])),
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
    api: async () => undefined,
    communityReport: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => '',
    mcpUrl: () => undefined,
    service: () => 'agent',
    out: async () => undefined,
  };
}

async function withSandboxResponse(
  responseFactory: () => Response,
  run: (requestedUrl: () => string) => Promise<void>,
): Promise<void> {
  const previousFetch = globalThis.fetch;
  const previousEnv = {
    TE_CLAUDE_BASE_URL: process.env.TE_CLAUDE_BASE_URL,
    SANDBOX_ID: process.env.SANDBOX_ID,
    SECRET_KEY: process.env.SECRET_KEY,
    SANDBOX_SECRET_KEY: process.env.SANDBOX_SECRET_KEY,
  };
  let url = '';

  process.env.TE_CLAUDE_BASE_URL = 'http://te-claude.test';
  process.env.SANDBOX_ID = 'sandbox-1';
  process.env.SECRET_KEY = 'sandbox-secret';
  delete process.env.SANDBOX_SECRET_KEY;
  globalThis.fetch = (async (input: string | URL | Request) => {
    url = String(input);
    return responseFactory();
  }) as typeof fetch;

  try {
    await run(() => url);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('reference upload accepts supported non-Markdown files', () => {
  const root = mkdtempSync(join(tmpdir(), 'ae-cli-skill-reference-upload-'));
  try {
    for (const fileName of ['notes.txt', 'data.csv', 'sheet.xlsx']) {
      const filePath = join(root, fileName);
      writeFileSync(filePath, fileName);
      assert.doesNotThrow(() =>
        uploadSkillReference.validate?.(
          context({ id: 'skill-id', file: filePath, subPath: '' }),
        ),
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('reference read returns text content without requiring --output', async () => {
  await withSandboxResponse(
    () =>
      new Response('reference text', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': "inline; filename*=UTF-8''notes.txt",
        },
      }),
    async (requestedUrl) => {
      const result = await readSkillReference.execute(
        context({ id: 'skill-id', path: 'notes.txt', output: '' }),
      );
      assert.deepEqual(result, { content: 'reference text', fileName: 'notes.txt' });
      assert.equal(
        requestedUrl(),
        'http://te-claude.test/api/sandbox/agent/skills/skill-id/references/notes.txt',
      );
    },
  );
});

test('reference read requires --output for binary content', async () => {
  const binary = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff]);
  await withSandboxResponse(
    () =>
      new Response(binary, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': "inline; filename*=UTF-8''sheet.xlsx",
        },
      }),
    async () => {
      await assert.rejects(
        () =>
          readSkillReference.execute(
            context({ id: 'skill-id', path: 'sheet.xlsx', output: '' }),
          ),
        (error: unknown) =>
          error instanceof CliValidationError &&
          error.code === 'output_required' &&
          error.hint === 'Re-run with --output <path> to preserve the original bytes.',
      );
    },
  );
});

test('reference read preserves binary content with --output', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ae-cli-skill-reference-read-'));
  const outputPath = join(root, 'sheet.xlsx');
  const binary = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff]);
  try {
    await withSandboxResponse(
      () =>
        new Response(binary, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': "inline; filename*=UTF-8''sheet.xlsx",
          },
        }),
      async () => {
        const result = await readSkillReference.execute(
          context({ id: 'skill-id', path: 'sheet.xlsx', output: outputPath }),
        );
        assert.deepEqual(readFileSync(outputPath), binary);
        assert.deepEqual(result, {
          saved: true,
          path: outputPath,
          size: binary.length,
          fileName: 'sheet.xlsx',
        });
      },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('reference binary guard does not change asset or script text reads', async () => {
  for (const [command, path, content] of [
    [readSkillAsset, 'guide.txt', 'asset text'],
    [readSkillScript, 'helper.sh', '#!/bin/sh\necho ok\n'],
  ] as const) {
    await withSandboxResponse(
      () =>
        new Response(content, {
          status: 200,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `inline; filename*=UTF-8''${path}`,
          },
        }),
      async () => {
        const result = await command.execute(
          context({ id: 'skill-id', path, output: '' }),
        );
        assert.deepEqual(result, { content, fileName: path });
      },
    );
  }
});
