/**
 * Community report framework contract tests.
 *
 * Run: npx tsx tests/community-report-framework.test.ts
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliValidationError, CommunityReportError } from '../src/core/errors.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const typesSource = readFileSync(join(root, 'src/framework/types.ts'), 'utf8');
const runnerSource = readFileSync(join(root, 'src/framework/runner.ts'), 'utf8');
const outputSource = readFileSync(join(root, 'src/framework/output.ts'), 'utf8');

assert.match(typesSource, /sensitive\?: boolean/);
assert.match(
  runnerSource,
  /cmd\.flags\.filter\(\(flag\) => flag\.sensitive\)\.map\(\(flag\) => flag\.name\)/,
);

const temporaryHome = mkdtempSync(join(tmpdir(), 'ae-community-report-framework-'));
const explicitSecret = 'UNIQUE_EXPLICIT_COMMUNITY_BODY_4f07d2';
const heuristicSecret = 'UNIQUE_HEURISTIC_CLI_TOKEN_7af81c';
const loggerScript = `
  import { logger } from './src/core/logger.ts';
  logger.command(
    'community data report',
    {
      rawPayload: ${JSON.stringify(explicitSecret)},
      accessToken: ${JSON.stringify(heuristicSecret)},
      endpoint: 'https://example.test/sync_content',
    },
    ['raw-payload'],
  );
`;

try {
  const child = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', loggerScript],
    {
      cwd: root,
      env: { ...process.env, HOME: temporaryHome },
      encoding: 'utf8',
    },
  );
  assert.equal(child.status, 0, child.stderr);

  const logDir = join(temporaryHome, '.ae-cli', 'log');
  const logs = readdirSync(logDir)
    .map((name) => readFileSync(join(logDir, name), 'utf8'))
    .join('\n');
  assert.doesNotMatch(logs, new RegExp(explicitSecret));
  assert.doesNotMatch(logs, new RegExp(heuristicSecret));
  assert.match(logs, /--rawPayload=\*\*\*/);
  assert.match(logs, /--accessToken=\*\*\*/);
  assert.match(logs, /--endpoint="https:\/\/example\.test\/sync_content"/);
} finally {
  rmSync(temporaryHome, { recursive: true, force: true });
}

const rejectedValue = 'UNIQUE_REJECTED_BUSINESS_VALUE_c2d991';
const unsafeLocation = {
  segment: 1,
  record: 2,
  field: 'content',
  value: rejectedValue,
};
const validationError = new CliValidationError('The record field is invalid.', {
  code: 'COMMUNITY_FIELD_INVALID',
  location: unsafeLocation,
});
assert.deepEqual(validationError.location, { segment: 1, record: 2, field: 'content' });
assert.doesNotMatch(JSON.stringify(validationError.location), new RegExp(rejectedValue));

const reportError = new CommunityReportError('Iris rejected the request.', {
  code: 1003,
  httpStatus: 400,
  hint: 'Correct the submitted schema.',
});
assert.equal(reportError.code, 1003);
assert.equal(reportError.httpStatus, 400);

assert.match(outputSource, /options: \{ log\?: boolean \} = \{\}/);
assert.match(outputSource, /if \(options\.log !== false\)/);
assert.match(runnerSource, /if \(!\(err instanceof CommunityReportError\)\)/);
assert.match(
  runnerSource,
  /printError\('api', message, err\.hint, err\.code, err\.meta, \{ log: false \}\)/,
);
assert.match(typesSource, /communityReport\(endpoint: string, rawBody: string\): Promise<any>/);
assert.doesNotMatch(
  runnerSource.slice(0, runnerSource.indexOf('export async function runCommand')),
  /community-report-client/,
);
assert.match(
  runnerSource,
  /_communityReportModule = await import\('\.\.\/core\/community-report-client\.js'\)/,
);

const communityReportMethod = runnerSource.match(
  /async communityReport\(endpoint: string, rawBody: string\): Promise<any> \{([\s\S]*?)\n    \},\n\n    async querySql/,
)?.[1];
assert(communityReportMethod, 'RuntimeContext.communityReport implementation is missing');
assert.match(communityReportMethod, /client\.communityReport\(endpoint, rawBody\)/);
assert.doesNotMatch(communityReportMethod, /ctx\.api|httpRequest|getClient\(/);

process.stdout.write('community report framework tests: passed\n');
