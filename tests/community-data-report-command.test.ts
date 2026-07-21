import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { RuntimeContext } from '../src/framework/types.js';
import { communityDataReport, readCommunityReportInput, resolveCommunityReportEndpoint } from '../src/commands/te-community/data/report.js';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'ae-community-data-command-'));
const temporaryHome = join(temporaryDirectory, 'home');
const chatPath = join(temporaryDirectory, 'chat.json');
const payloadPath = join(temporaryDirectory, 'payload.json');
const secret = 'UNIQUE_CHAT_BODY_8e580f';

const chatRecord = {
  chat_uuid: 'chat-1',
  user_id: 'user-1',
  chat_room_type: 'custom-room-kind',
  chat_room_id: 'room-1',
  content: secret,
  publish_time: '2026-07-21 10:00:00',
  unknown_record_field: { preserved: true },
};
const mixedPayload = [
  { data_type: 'post', data: { post_uuid: 'post-1', unknown: 'kept' } },
  {
    data_type: 'interaction',
    data: {
      content_uuid: 'post-1',
      content_type: 0,
      collect_time: '2026-07-21 10:05:00',
      metrics: { views: '9223372036854775807' },
    },
  },
];

writeFileSync(chatPath, JSON.stringify(chatRecord));
writeFileSync(payloadPath, JSON.stringify(mixedPayload));

try {
  const inline = runDryRun(['--data-type', 'chat', '--data', JSON.stringify(chatRecord)]);
  assert.equal(inline.status, 0, inline.stderr);
  const inlineEnvelope = JSON.parse(inline.stdout);
  assert.deepEqual(inlineEnvelope.data.data_types, ['chat']);
  assert.equal(inlineEnvelope.data.record_count, 1);
  assert.deepEqual(Object.keys(inlineEnvelope.data).sort(), [
    'data_types',
    'endpoint',
    'normalization',
    'record_count',
    'request_bytes',
    'segment_count',
  ]);
  assert.doesNotMatch(inline.stdout, new RegExp(secret));

  const plainPath = runDryRun(['--data-type', 'chat', '--data', chatPath]);
  assert.equal(plainPath.status, 0, plainPath.stderr);
  assert.equal(JSON.parse(plainPath.stdout).data.record_count, 1);

  const atPath = runDryRun(['--data-type', 'chat', '--data', `@${chatPath}`]);
  assert.equal(atPath.status, 0, atPath.stderr);
  assert.equal(JSON.parse(atPath.stdout).data.record_count, 1);

  const stdin = runDryRun(['--data-type', 'chat', '--data', '-'], JSON.stringify(chatRecord));
  assert.equal(stdin.status, 0, stdin.stderr);
  assert.equal(JSON.parse(stdin.stdout).data.record_count, 1);

  const mixed = runDryRun(['--payload', `@${payloadPath}`]);
  assert.equal(mixed.status, 0, mixed.stderr);
  const mixedOutput = JSON.parse(mixed.stdout).data;
  assert.deepEqual(mixedOutput.data_types, ['post', 'interaction']);
  assert.equal(mixedOutput.segment_count, 2);
  assert.equal(mixedOutput.record_count, 2);
  assert.doesNotMatch(mixed.stdout, /9223372036854775807/);

  const conflict = runDryRun([
    '--data-type', 'chat', '--data', `@${chatPath}`, '--payload', `@${payloadPath}`,
  ]);
  assert.equal(conflict.status, 1);
  const conflictEnvelope = JSON.parse(conflict.stderr);
  assert.equal(conflictEnvelope.error.type, 'validation');
  assert.equal(conflictEnvelope.error.code, 'community_input_mode');

  const invalidRecord = runDryRun([
    '--data-type', 'chat', '--data', '{"chat_uuid":"DO_NOT_ECHO_THIS_VALUE"}',
  ]);
  assert.equal(invalidRecord.status, 1);
  const invalidEnvelope = JSON.parse(invalidRecord.stderr);
  assert.equal(invalidEnvelope.error.type, 'validation');
  assert.deepEqual(invalidEnvelope.meta.location, { segment: 0, record: 0, field: 'user_id' });
  assert.match(invalidEnvelope.error.hint, /ae-cli community data report --help/);
  assert.match(invalidEnvelope.error.hint, /meta\.location/);
  assert.doesNotMatch(invalidRecord.stderr, /DO_NOT_ECHO_THIS_VALUE/);

  const hostIsNotEndpoint = runCli([
    '--host', 'https://ae.example.test',
    '--dry-run',
    'community', 'data', 'report',
    '--space-id', '5', '--channel-id', '1', '--source-id', '9',
    '--data-type', 'chat', '--data', `@${chatPath}`,
  ], undefined, { AE_IRIS_SYNC_ENDPOINT: '' });
  assert.equal(hostIsNotEndpoint.status, 1);
  assert.equal(JSON.parse(hostIsNotEndpoint.stderr).error.code, 'community_missing_endpoint');

  const credentialSecret = 'UNIQUE_ENDPOINT_PASSWORD_14cd3f';
  const invalidCredentialEndpoint = runCli([
    '--dry-run',
    'community', 'data', 'report',
    '--endpoint', `https://user:${credentialSecret}@iris.example.test/sync_content`,
    '--space-id', '5', '--channel-id', '1', '--source-id', '9',
    '--data-type', 'chat', '--data', `@${chatPath}`,
  ]);
  assert.equal(invalidCredentialEndpoint.status, 1);
  assert.equal(JSON.parse(invalidCredentialEndpoint.stderr).error.code, 'community_invalid_endpoint');

  const environmentEndpoint = runCli([
    '--dry-run',
    'community', 'data', 'report',
    '--space-id', '5', '--channel-id', '1', '--source-id', '9',
    '--data-type', 'chat', '--data', `@${chatPath}`,
  ], undefined, { AE_IRIS_SYNC_ENDPOINT: 'http://env.example.test/sync_content' });
  assert.equal(environmentEndpoint.status, 0, environmentEndpoint.stderr);
  assert.equal(JSON.parse(environmentEndpoint.stdout).data.endpoint, 'http://env.example.test/sync_content');

  const explicitEndpoint = runCli([
    '--dry-run',
    'community', 'data', 'report',
    '--endpoint', 'https://flag.example.test/sync_content',
    '--space-id', '5', '--channel-id', '1', '--source-id', '9',
    '--data-type', 'chat', '--data', `@${chatPath}`,
  ], undefined, { AE_IRIS_SYNC_ENDPOINT: 'http://env.example.test/sync_content' });
  assert.equal(explicitEndpoint.status, 0, explicitEndpoint.stderr);
  assert.equal(JSON.parse(explicitEndpoint.stdout).data.endpoint, 'https://flag.example.test/sync_content');

  const missingSuffixEndpoint = runCli([
    '--dry-run',
    'community', 'data', 'report',
    '--endpoint', 'https://iris.example.test/ingest',
    '--space-id', '5', '--channel-id', '1', '--source-id', '9',
    '--data-type', 'chat', '--data', `@${chatPath}`,
  ]);
  assert.equal(missingSuffixEndpoint.status, 1);
  const missingSuffixEnvelope = JSON.parse(missingSuffixEndpoint.stderr);
  assert.equal(missingSuffixEnvelope.error.code, 'community_invalid_endpoint');
  assert.match(missingSuffixEnvelope.error.message, /path does not end with the required \/sync_content suffix/);
  assert.match(missingSuffixEnvelope.error.hint, /final path component/);
  assert.doesNotMatch(missingSuffixEndpoint.stderr, /iris\.example\.test/);

  for (const endpoint of [
    'ftp://iris.example.test/sync_content',
    'https://user:pass@iris.example.test/sync_content',
    'https://iris.example.test/sync_content?token=x',
    'https://iris.example.test/sync_content#fragment',
    'https://iris.example.test/other',
    'https://iris.example.test/sync_content/',
  ]) {
    assert.throws(
      () => resolveCommunityReportEndpoint(endpoint, {}),
      (error: any) => error?.code === 'community_invalid_endpoint',
    );
  }
  assert.equal(
    resolveCommunityReportEndpoint('https://iris.example.test/prefix/sync_content', {}),
    'https://iris.example.test/prefix/sync_content',
  );

  assert.deepEqual(readCommunityReportInput(chatPath, 'data'), readCommunityReportInput(`@${chatPath}`, 'data'));

  let reportCalls = 0;
  let transmittedBody = '';
  const fakeContext = contextFor({
    endpoint: 'http://iris.example.test/sync_content',
    spaceId: '5',
    channelId: '1',
    sourceId: '9',
    payload: `@${payloadPath}`,
    zoneId: 'Asia/Shanghai',
  }, async (_endpoint, body) => {
    reportCalls += 1;
    transmittedBody = body;
    return {
      return_code: 0,
      return_message: 'success',
      http_status: 200,
      request_bytes: Buffer.byteLength(body),
      response_bytes: 44,
    };
  });
  const queued = await communityDataReport.execute(fakeContext);
  assert.equal(reportCalls, 1);
  assert.match(transmittedBody, /"game_id":5/);
  assert.match(transmittedBody, /9223372036854775807/);
  assert.doesNotMatch(transmittedBody, /"9223372036854775807"/);
  assert.equal(queued.status, 'queued');
  assert.equal(queued.submitted_record_count, 2);
  assert.equal(queued.persistence_verified, false);
  assert.equal(
    queued.next_step,
    'After asynchronous processing, verify the submitted record identifiers through an authorized downstream query or storage path before treating this submission as persisted.',
  );
  assert.equal(queued.space_id, '5');
  assert.equal(JSON.stringify(queued).includes(secret), false);

  const commandHelp = runCli(['community', 'data', 'report', '--help']);
  assert.equal(commandHelp.status, 0, commandHelp.stderr);
  assert.doesNotMatch(commandHelp.stdout, /--host <url>/);
  assert.match(commandHelp.stdout, /Record schema summary \(required fields\):/);
  assert.match(commandHelp.stdout, /post: post_uuid/);
  assert.match(commandHelp.stdout, /video: video_uuid/);
  assert.match(commandHelp.stdout, /reply: reply_uuid, root_id, root_type/);
  assert.match(commandHelp.stdout, /danmu: danmu_uuid, timestamp, root_id, root_type/);
  assert.match(commandHelp.stdout, /live_room: uuid, room_id, room_name, room_avatar, fans, timestamp/);
  assert.match(commandHelp.stdout, /live_interaction: uuid, activity_type, activity_content, room_id, stream_start_time, timestamp/);
  assert.match(commandHelp.stdout, /chat: chat_uuid, user_id, chat_room_type, chat_room_id, content, publish_time/);
  assert.match(commandHelp.stdout, /interaction: content_uuid, content_type, collect_time, metrics/);
  assert.match(commandHelp.stdout, /--payload for mixed data types/);

  const logDir = join(temporaryHome, '.ae-cli', 'log');
  const logs = readdirSync(logDir).map((name) => readFileSync(join(logDir, name), 'utf8')).join('\n');
  assert.doesNotMatch(logs, new RegExp(secret));
  assert.doesNotMatch(logs, new RegExp(credentialSecret));
  assert.match(logs, /--endpoint=\*\*\*/);
  assert.match(logs, /--data=\*\*\*/);
  assert.match(logs, /--payload=\*\*\*/);

  process.stdout.write('OK: community data report command supports redacted input modes and queued semantics.\n');
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

function runDryRun(inputArgs: string[], stdin?: string) {
  return runCli([
    '--dry-run',
    'community', 'data', 'report',
    '--endpoint', 'http://127.0.0.1:1/sync_content',
    '--space-id', '5', '--channel-id', '1', '--source-id', '9',
    ...inputArgs,
  ], stdin);
}

function runCli(args: string[], stdin?: string, extraEnvironment: NodeJS.ProcessEnv = {}) {
  return spawnSync('npx', ['tsx', 'src/index.ts', '--no-update-check', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: stdin,
    env: {
      ...process.env,
      HOME: temporaryHome,
      NODE_NO_WARNINGS: '1',
      AE_IRIS_SYNC_ENDPOINT: '',
      ...extraEnvironment,
    },
  });
}

function contextFor(
  values: Record<string, string>,
  report: (endpoint: string, body: string) => Promise<any>,
): RuntimeContext {
  return {
    str(name) {
      const key = name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      return values[key] ?? '';
    },
    num: () => 0,
    optionalNum: () => undefined,
    bool: () => false,
    json: () => undefined,
    api: async () => assert.fail('community data report must not use ctx.api'),
    communityReport: report,
    querySql: async () => assert.fail('not used'),
    queryReportData: async () => assert.fail('not used'),
    token: async () => assert.fail('community data report must not resolve an AE token'),
    host: () => assert.fail('community data report must not derive the endpoint from --host'),
    mcpUrl: () => undefined,
    service: () => 'community',
    out: async () => undefined,
  };
}
