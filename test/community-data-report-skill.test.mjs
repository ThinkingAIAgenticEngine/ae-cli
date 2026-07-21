import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillPath = path.join(ROOT, 'skills/ae-community/SKILL.md');
const referencePath = path.join(
  ROOT,
  'skills/ae-community/references/community-data-report.md',
);
const skill = readFileSync(skillPath, 'utf8');
const reference = readFileSync(referencePath, 'utf8');
const admission = readFileSync(path.join(ROOT, 'docs/capability-command-admission.md'), 'utf8');
const agents = readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
const claude = readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');

function test(name, fn) {
  fn();
  console.log(`  OK: ${name}`);
}

function getFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, 'SKILL.md must have YAML frontmatter');
  return match[1];
}

function sectionBetween(source, startHeading, endHeading) {
  const start = source.indexOf(startHeading);
  const end = source.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(start, -1, `${startHeading} not found`);
  assert.notEqual(end, -1, `${endHeading} not found`);
  assert.ok(end > start, `${endHeading} must appear after ${startHeading}`);
  return source.slice(start, end);
}

console.log('community data report skill contract tests');

test('revision and frontmatter trigger reporting and WeCom ingestion requests', () => {
  const frontmatter = getFrontmatter(skill);
  assert.match(skill, /^Skill revision: 2\.4\.1\.$/m);
  assert.match(frontmatter, /data reporting/i);
  assert.match(frontmatter, /ingestion\/import\/submission/i);
  assert.match(frontmatter, /WeCom chat data integration/i);
  for (const trigger of ['社区数据上报', '导入', '提交社区数据', '企微聊天数据接入']) {
    assert.ok(frontmatter.includes(trigger), `frontmatter missing trigger: ${trigger}`);
  }
});

test('skill routes the command to its detailed reference', () => {
  assert.match(skill, /ae-cli community data report/);
  assert.ok(
    skill.includes('[`community-data-report.md`](references/community-data-report.md)'),
    'SKILL.md must link the data-report reference',
  );
  assert.match(reference, /^# Community Data Reporting$/m);
  assert.match(reference, /--data-type <type> --data <inline\|path\|@path\|->/);
  assert.match(reference, /--payload <inline\|path\|@path\|->/);
});

test('reporting uses an explicit endpoint and never derives it from host', () => {
  const workflow = sectionBetween(
    skill,
    '### Data Reporting Workflow',
    '## Dry-run debugging',
  );
  assert.match(workflow, /complete `\/sync_content` endpoint/);
  assert.match(workflow, /Never guess, derive, or concatenate it/);

  assert.match(reference, /1\. `--endpoint`[\s\S]*2\. `AE_IRIS_SYNC_ENDPOINT`/);
  assert.match(reference, /Never guess, concatenate, or derive this URL from `--host`/);
  assert.match(reference, /`--host` is unrelated to this command/);
  assert.doesNotMatch(reference, /--host\s+https?:\/\//);
  assert.match(skill, /It is intentionally unavailable for `community data report`; use `--endpoint` there/);
});

test('ordinary write needs intent but no confirmation or yes flag', () => {
  const writeSection = skill.slice(skill.indexOf('## Write operations'));
  assert.match(writeSection, /`risk: write`/);
  assert.match(writeSection, /explicit user intent is sufficient/);
  assert.match(writeSection, /no confirmation or `--yes` is required/);
  assert.match(writeSection, /Only commands marked \*\*`risk: high-risk-write`\*\* use the confirmation gate/);

  assert.match(reference, /clear user request to report the data is sufficient/);
  assert.match(reference, /do not add `--yes` or ask for a second confirmation/);
});

test('success is queued and never claims persistence', () => {
  assert.match(skill, /status: "queued"/);
  assert.match(skill, /persistence_verified: false/);
  assert.match(skill, /never as per-record acceptance or durable storage/);

  assert.match(reference, /"status": "queued"/);
  assert.match(reference, /"persistence_verified": false/);
  assert.match(reference, /"next_step": "After asynchronous processing/);
  assert.match(reference, /does not currently return a query URL or trace ID/);
  assert.match(reference, /does not prove that every record passed asynchronous processing or reached durable storage/);
  assert.match(reference, /Never describe `status: "queued"` as accepted, imported, persisted, or queryable/);
});

test('timeouts require downstream checking and forbid automatic retry', () => {
  assert.match(skill, /A timeout leaves delivery state unknown/);
  assert.match(skill, /Check the downstream query\/storage side/);
  assert.match(skill, /never retry automatically/);

  assert.match(reference, /The client makes at most one POST/);
  assert.match(reference, /never retries automatically/);
  assert.match(reference, /The request timeout is 30 seconds/);
  assert.match(reference, /Never automate a retry/);
  assert.match(reference, /check downstream state first/);
});

test('reference documents every supported schema', () => {
  const schemaSection = sectionBetween(reference, '## Schemas', '## Normalization');
  const dataTypes = [
    'post',
    'video',
    'reply',
    'danmu',
    'live_room',
    'live_interaction',
    'chat',
    'interaction',
  ];
  for (const dataType of dataTypes) {
    assert.match(
      schemaSection,
      new RegExp('^### `' + dataType + '`$', 'm'),
      `missing schema heading for ${dataType}`,
    );
  }
  assert.match(reference, /Supported `data_type` values are `post`, `video`, `reply`, `danmu`, `live_room`, `live_interaction`, `chat`, and `interaction`/);
});

test('agents discover required fields from help and preserve the chat UUID contract', () => {
  assert.match(skill, /ae-cli community data report --help/);
  assert.match(skill, /required record fields for every supported `data_type`/);
  assert.match(reference, /ae-cli community data report --help/);
  assert.match(reference, /required fields of every supported `data_type`/);
  assert.match(reference, /`chat_uuid` is a required JSON string/);
  assert.match(reference, /exceeds 36 UTF-16 code units/);
  assert.match(reference, /keeps the first 36 units/);
  assert.match(reference, /`chat\.chat_uuid` in the normalization statistics/);
  assert.match(reference, /does not reject the record for length/);
});

test('privacy contract protects payloads and credentials from logs and headers', () => {
  const privacy = reference.slice(reference.indexOf('## Privacy'));
  assert.match(privacy, /Prefer `@file` or stdin/);
  assert.match(privacy, /Inline JSON can remain in shell history or process listings/);
  assert.match(privacy, /only `Content-Type: application\/json` and `Accept: application\/json`/);
  assert.match(privacy, /does not send AE access tokens, CLI tokens, or custom authorization headers/);
  assert.match(privacy, /Request and response bodies are excluded from CLI HTTP logs/);
  assert.match(privacy, /Logs contain only endpoint, status, and byte counts/);
  assert.match(privacy, /Dry-run output is redacted by default/);
});

test('admission rules define the stable ingestion data-plane L2 exception', () => {
  assert.equal(agents, claude, 'AGENTS.md and CLAUDE.md must remain byte-identical');
  const sectionStart = admission.indexOf('ingestion data-plane L2');
  const sectionEnd = admission.indexOf('## 2.', sectionStart);
  assert.notEqual(sectionStart, -1);
  assert.notEqual(sectionEnd, -1);
  const exception = admission.slice(sectionStart, sectionEnd);
  for (const contractTerm of [
    'AE access token',
    'CLI token',
    'stdin',
    'schema',
    'dry-run',
    'lossless',
    'Transitional',
  ]) {
    assert.ok(exception.includes(contractTerm), `admission exception missing ${contractTerm}`);
  }
  assert.match(agents, /ingestion data-plane.*L2/);
  assert.match(agents, /AE access token、CLI token/);
});

console.log('All community data report skill contract tests passed.');
