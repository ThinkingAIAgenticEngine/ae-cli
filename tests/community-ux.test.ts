import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import communityCommands from '../src/commands/te-community/index.ts';

const cli = join(process.cwd(), 'dist', 'index.js');

function run(args: string[]) {
  return spawnSync(process.execPath, [cli, '--no-update-check', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function errorEnvelope(args: string[]) {
  const result = run(args);
  assert.notEqual(result.status, 0);
  return JSON.parse(result.stderr);
}

const communityHelp = run(['community', '--help']);
assert.equal(communityHelp.status, 0);
assert.match(communityHelp.stdout, /spaces/);
assert.match(communityHelp.stdout, /sources/);
assert.match(communityHelp.stdout, /evidence/);

const evidenceHelp = run(['community', 'evidence', 'fetch', '--help']);
assert.equal(evidenceHelp.status, 0);
assert.match(evidenceHelp.stdout, /space-id[\s\S]*required/);
assert.match(evidenceHelp.stdout, /max-chars/);
assert.equal(run(['community', '+fetch-evidence', '--help']).status, 0);

const sourcesList = communityCommands.find(
  (command) => command.resource === 'sources' && command.command === 'list',
);
assert.equal(sourcesList?.capabilityId, 'community.source.list');
assert.equal(sourcesList?.flags.find((flag) => flag.name === 'space-id')?.type, 'int64');
assert.equal(sourcesList?.flags.find((flag) => flag.name === 'space-id')?.required, true);

const curatedCommands = communityCommands.filter((command) => command.command.startsWith('+') && command.command !== '+fetch-evidence');
assert.equal(curatedCommands.length, 19);
for (const command of curatedCommands) {
  const spaceId = command.flags.find((flag) => flag.name === 'space-id');
  const gameId = command.flags.find((flag) => flag.name === 'game-id');
  assert.equal(spaceId?.type, 'int64', `${command.command} space-id must be int64`);
  assert.equal(spaceId?.required, true, `${command.command} space-id must be required`);
  assert.equal(gameId?.type, 'int64', `${command.command} game-id must be int64`);
  assert.equal(gameId?.required, false, `${command.command} game-id must be optional`);
  for (const channelId of command.flags.filter((flag) => flag.name === 'channel-id')) {
    assert.equal(channelId.type, 'int64', `${command.command} channel-id must be int64`);
  }
}

const commandHelp = run(['community', '+get_channel_info', '--help']);
assert.equal(commandHelp.status, 0);
assert.match(commandHelp.stdout, /space-id[\s\S]*required/);
assert.doesNotMatch(commandHelp.stdout, /game-id[\s\S]*required/);

const sourcesHelp = run(['community', 'sources', 'list', '--help']);
assert.equal(sourcesHelp.status, 0);
assert.match(sourcesHelp.stdout, /space-id[\s\S]*required/);

const mismatchedIds = errorEnvelope([
  'community', '+get_channel_info',
  '--space-id', '1940327799817117696',
  '--game-id', '1940327799817117697',
]);
assert.equal(mismatchedIds.ok, false);
assert.equal(mismatchedIds.error.type, 'validation');
assert.match(mismatchedIds.error.message, /must match/);

const invalidDate = errorEnvelope([
  'community', '+get_overview_metrics',
  '--space-id', '1940327799817117696',
  '--start-time', '2026-02-31',
  '--end-time', '2026-03-01',
]);
assert.equal(invalidDate.error.type, 'validation');
assert.match(invalidDate.error.message, /valid date/);

const invalidList = errorEnvelope([
  'community', '+search_posts',
  '--space-id', '1940327799817117696',
  '--start-time', '2026-03-01',
  '--end-time', '2026-03-02',
  '--sentiment-types', '0,9',
]);
assert.equal(invalidList.error.type, 'validation');
assert.match(invalidList.error.message, /containing only/);

const oversizedPage = errorEnvelope([
  'community', '+search_posts',
  '--space-id', '1940327799817117696',
  '--start-time', '2026-03-01',
  '--end-time', '2026-03-02',
  '--page-size', '10001',
]);
assert.equal(oversizedPage.error.type, 'validation');
assert.match(oversizedPage.error.message, /between 1 and 10000/);

const unsupportedPreview = errorEnvelope([
  '--dry-run', 'community', '+get_channel_info', '--space-id', '1940327799817117696',
]);
assert.equal(unsupportedPreview.error.type, 'validation');
assert.match(unsupportedPreview.error.message, /not supported/);

const unsupportedValidation = errorEnvelope([
  '--validate', 'community', '+get_channel_info', '--space-id', '1940327799817117696',
]);
assert.equal(unsupportedValidation.error.type, 'validation');
assert.match(unsupportedValidation.error.message, /not supported/);

const invalidPageNumber = errorEnvelope([
  'community', '+search_posts',
  '--space-id', '1940327799817117696',
  '--start-time', '2026-03-01',
  '--end-time', '2026-03-02',
  '--page-num', '0',
]);
assert.equal(invalidPageNumber.error.type, 'validation');
assert.match(invalidPageNumber.error.message, /between 1 and 10000/);

const reversedRange = errorEnvelope([
  'community', '+search_posts',
  '--space-id', '1940327799817117696',
  '--start-time', '2026-03-03',
  '--end-time', '2026-03-02',
]);
assert.equal(reversedRange.error.type, 'validation');
assert.match(reversedRange.error.message, /must not be earlier/);

const invalidTagFilter = errorEnvelope([
  'community', '+search_posts',
  '--space-id', '1940327799817117696',
  '--start-time', '2026-03-01',
  '--end-time', '2026-03-02',
  '--tag-filters', '[{"tagName":"Character","tagCode":"hero","inferenceType":1,"calcuSymbol":0}]',
]);
assert.equal(invalidTagFilter.error.type, 'validation');
assert.match(invalidTagFilter.error.message, /requires non-empty inferenceType/);

const outOfRangeId = errorEnvelope([
  'community', '+get_channel_info',
  '--space-id', '9223372036854775808',
]);
assert.equal(outOfRangeId.error.type, 'validation');
assert.match(outOfRangeId.error.message, /signed 64-bit integer/);

const invalidChannelList = errorEnvelope([
  'community', '+search_posts',
  '--space-id', '1940327799817117696',
  '--start-time', '2026-03-01',
  '--end-time', '2026-03-02',
  '--channel-id-list', '1940327799817117696,not-an-id',
]);
assert.equal(invalidChannelList.error.type, 'validation');
assert.match(invalidChannelList.error.message, /positive int64 values/);

await import('./community-spaces-count.test.ts');
process.stdout.write('community UX tests passed\n');
