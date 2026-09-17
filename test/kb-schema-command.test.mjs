import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { executeSchema, schema } from '../src/commands/te-kb/schema.ts';
import { parseKbResponse } from '../src/core/mcp-access.ts';

function makeContext(values = {}) {
  return {
    str: (name) => values[name] ?? '',
    bool: (name) => Boolean(values[name]),
    host: () => 'https://ta.example/',
  };
}

const customInstructionsFlag = schema.flags.find(
  (flag) => flag.name === 'custom-instructions',
);
assert.deepEqual(customInstructionsFlag, {
  name: 'custom-instructions',
  type: 'string',
  required: false,
  sensitive: true,
  desc: 'Optional per-run instructions for generating this knowledge base schema',
});
const customInstructionsFileFlag = schema.flags.find(
  (flag) => flag.name === 'custom-instructions-file',
);
assert.deepEqual(customInstructionsFileFlag, {
  name: 'custom-instructions-file',
  type: 'string',
  required: false,
  sensitive: true,
  desc: 'Read optional per-run schema generation instructions from a UTF-8 text file',
});

const scopeFlag = schema.flags.find((flag) => flag.name === 'scope');
assert.deepEqual(scopeFlag, {
  name: 'scope',
  type: 'string',
  required: false,
  desc: 'Exact knowledge base scope: personal | company (omit for personal → company fallback)',
});

const modelFlag = schema.flags.find((flag) => flag.name === 'model');
test('kb +schema command > documents model references instead of display names', () => {
  assert.match(modelFlag?.desc ?? '', /model reference/i);
  assert.match(modelFlag?.desc ?? '', /Model\.id/);
  assert.match(modelFlag?.desc ?? '', /modelId::scope/);
  assert.doesNotMatch(modelFlag?.desc ?? '', /displayName/);
});

const withCustomInstructions = schema.dryRun(
  makeContext({
    name: 'engineering-handbook',
    scope: 'company',
    force: true,
    model: 'claude-sonnet-4-6',
    'custom-instructions': 'Prioritize troubleshooting workflows.',
  }),
);
assert.deepEqual(withCustomInstructions, {
  method: 'POST',
  url: 'https://ta.example/agent/api/external/knowledge-bases/schema',
  body: {
    name: 'engineering-handbook',
    scope: 'company',
    force: true,
    model: 'claude-sonnet-4-6',
    customInstructions: 'Prioritize troubleshooting workflows.',
  },
});

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-schema-command-'));
const instructionsFile = path.join(tempDir, 'compile-rules.md');
fs.writeFileSync(instructionsFile, 'Use the source tree root only.');
const withCustomInstructionsFile = schema.dryRun(
  makeContext({
    name: 'engineering-handbook',
    scope: 'personal',
    model: 'system-model-glm-5.2',
    'custom-instructions-file': instructionsFile,
  }),
);
assert.deepEqual(withCustomInstructionsFile.body, {
  name: 'engineering-handbook',
  scope: 'personal',
  model: 'system-model-glm-5.2',
  customInstructions: 'Use the source tree root only.',
});
assert.throws(
  () => schema.validate(makeContext({
    name: 'engineering-handbook',
    'custom-instructions': 'inline',
    'custom-instructions-file': instructionsFile,
  })),
  /Use either --custom-instructions or --custom-instructions-file/,
);

const withoutCustomInstructions = schema.dryRun(
  makeContext({ name: 'engineering-handbook' }),
);
assert.deepEqual(withoutCustomInstructions.body, {
  name: 'engineering-handbook',
});
assert.throws(
  () => schema.validate(makeContext({ name: 'engineering-handbook', scope: 'system' })),
  /Invalid --scope.*personal.*company/,
);

const apiCalls = [];
await executeSchema(
  makeContext({
    name: 'engineering-handbook',
    'custom-instructions': 'Prioritize troubleshooting workflows.',
  }),
  async (...args) => {
    apiCalls.push(args);
    return { status: 'generating' };
  },
);
assert.deepEqual(apiCalls[0]?.[5], { preserveBusinessErrorCode: true });

const invalidBody = JSON.stringify({
  error: 'Custom instructions are invalid.',
  code: 'KB_SCHEMA_CUSTOM_INSTRUCTIONS_INVALID',
});
const conflictBody = JSON.stringify({
  error: 'Schema generation is already in progress.',
  code: 'KB_SCHEMA_GENERATION_IN_PROGRESS',
});

assert.throws(
  () => parseKbResponse(new Response(invalidBody, { status: 400 }), invalidBody),
  new Error('Custom instructions are invalid.'),
);
assert.throws(
  () =>
    parseKbResponse(new Response(invalidBody, { status: 400 }), invalidBody, {
      preserveBusinessErrorCode: true,
    }),
  new Error('KB_SCHEMA_CUSTOM_INSTRUCTIONS_INVALID: Custom instructions are invalid.'),
);
assert.throws(
  () =>
    parseKbResponse(new Response(conflictBody, { status: 409 }), conflictBody, {
      preserveBusinessErrorCode: true,
    }),
  new Error('KB_SCHEMA_GENERATION_IN_PROGRESS: Schema generation is already in progress.'),
);

const successBody = JSON.stringify({ data: { status: 'generating' } });
assert.equal(
  parseKbResponse(new Response(successBody, { status: 202 }), successBody, {
    preserveBusinessErrorCode: true,
  }).status,
  'generating',
);
for (const preserveBusinessErrorCode of [false, true]) {
  assert.throws(
    () =>
      parseKbResponse(new Response('{}', { status: 401, statusText: 'Unauthorized' }), '{}', {
        preserveBusinessErrorCode,
      }),
    new Error('KB API token auth failed: HTTP 401 Unauthorized'),
  );
}

console.log('kb schema command tests passed');
