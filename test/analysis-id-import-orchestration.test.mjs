import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const csv = path.join(os.tmpdir(), `ae-cli-id-tag-${process.pid}.csv`);
fs.writeFileSync(csv, 'real-account,VIP\n', 'utf8');

function runCli(args) {
  return spawnSync('npx', ['tsx', 'src/index.ts', '--no-update-check', ...args], {
    cwd: ROOT,
    env: { ...process.env, HOME: os.tmpdir() },
    encoding: 'utf8',
  });
}

try {
  const purposeHelp = runCli(['analysis', 'input-file', 'purpose', 'list', '--help']);
  assert.equal(purposeHelp.status, 0, purposeHelp.stderr);
  assert.match(purposeHelp.stdout, /analysis input-file purpose list/);

  const oldUpload = runCli(['metadata', 'input-file', 'upload', '--help']);
  assert.notEqual(oldUpload.status, 0, 'metadata input-file upload must not remain registered');

  const dryRun = runCli([
    '--host', 'https://ta.example', '--dry-run',
    'analysis', 'user-tag', 'create-id',
    '--project-id', '1', '--entity-id', '1',
    '--association-property', '#account_id',
    '--input-file', csv, '--display-name', '会员等级',
  ]);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  const data = JSON.parse(dryRun.stdout).data;
  assert.equal(data.steps.length, 2);
  assert.equal(data.steps[0].body.multipart.purpose, 'analysis.user.id_import');
  assert.equal(data.steps[0].body.multipart.file, csv);
  assert.match(data.steps[1].url, /analysis\.user_tag\.create_id\/dry-run$/);
  assert.equal(data.steps[1].body.input_file_id, '<input_file_id returned by upload step>');

  const conflicting = runCli([
    '--dry-run', 'analysis', 'user-cluster', 'create-id',
    '--project-id', '1', '--entity-id', '1',
    '--association-property', 'email', '--input-file', csv,
    '--file-content', 'a@example.com', '--display-name', '冲突输入',
  ]);
  assert.notEqual(conflicting.status, 0);
  assert.match(conflicting.stdout + conflicting.stderr, /exactly one of --input-file/);
} finally {
  fs.rmSync(csv, { force: true });
}

console.log('analysis ID import orchestration tests passed');
