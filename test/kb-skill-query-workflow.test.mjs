import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(path.join(ROOT, 'skills/ae-kb/SKILL.md'), 'utf8');
const readme = readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const readmeZh = readFileSync(path.join(ROOT, 'README.zh.md'), 'utf8');
const openSourceReadme = readFileSync(
  path.join(ROOT, 'open-source/README.opensource.md'),
  'utf8',
);
const openSourceReadmeZh = readFileSync(
  path.join(ROOT, 'open-source/README.opensource.zh.md'),
  'utf8',
);
const workflow = readFileSync(
  path.join(ROOT, 'skills/ae-kb/references/query-workflow.md'),
  'utf8',
);

function test(name, fn) {
  fn();
  console.log(`  OK: ${name}`);
}

function sectionBetween(source, startHeading, endHeading) {
  const start = source.indexOf(startHeading);
  const end = source.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(start, -1, `${startHeading} not found`);
  assert.notEqual(end, -1, `${endHeading} not found`);
  assert.ok(end > start, `${endHeading} must appear after ${startHeading}`);
  return source.slice(start, end);
}

console.log('kb skill query workflow tests');

test('main skill delegates query flow to the reference', () => {
  const explore = sectionBetween(
    skill,
    '### Explore Knowledge Base Pages',
    '### Remove One Source',
  );
  assert.match(explore, /references\/query-workflow\.md/);
  assert.match(explore, /same-page read windows/);
  assert.match(explore, /linked-page re-grep/);
  assert.match(explore, /outline-derived ranges/);
  assert.doesNotMatch(explore, /On a long page/);
});

test('+ask contract does not expose max-turns', () => {
  const ask = sectionBetween(skill, '### `+ask`', '### `+ask-status`');
  assert.doesNotMatch(ask, /max-turns|maxTurns/);
});

test('+ask documents the unified typed error envelope', () => {
  const ask = sectionBetween(skill, '### `+ask`', '### `+ask-status`');
  assert.match(ask, /error\.type.*api/);
  assert.match(ask, /error\.code/);
  assert.match(ask, /model_unavailable/);
  assert.match(ask, /retrieval_error/);
  assert.doesNotMatch(ask, /category|retryable|model_error|invalid_sources/);
});

test('+ask-status preserves failed execution code inside success data', () => {
  const status = sectionBetween(skill, '### `+ask-status`', '### `+list`');
  assert.match(status, /data\.error\.code/);
});

test('retrieval numeric ranges match the server contract', () => {
  const grep = sectionBetween(skill, '### `+grep`', '### `+read`');
  const read = sectionBetween(skill, '### `+read`', '### `+new`');
  assert.match(grep, /--top-k.*1-50/);
  assert.match(read, /--offset.*integer.*1-based|--offset.*1-based.*integer/);
  assert.match(read, /--limit.*1-2000/);
  assert.doesNotMatch(read, /1-10000/);
});

test('workflow chooses read windows by observable branch', () => {
  const locator = sectionBetween(
    workflow,
    '3. **Choose the section locator.**',
    '4. **Read the selected window.**',
  );
  assert.match(locator, /Section preview of a page group/);
  assert.match(workflow, /`sectionStartLine` \/ `sectionEndLine` are the section boundaries/);
  assert.match(workflow, /Use\s+them as the read window/);
  assert.match(workflow, /widen to the section boundary in one\s+more call/);
  assert.match(locator, /read the section range with/);
  assert.match(locator, /narrow the window under the section boundary/);
  assert.match(workflow, /enclosing heading-section\s+boundaries/);
  assert.match(workflow, /maximum boundary when choosing a\s+smaller window/);
  assert.match(locator, /`--offset sectionStartLine`/);
  assert.match(locator, /`--limit sectionEndLine - sectionStartLine \+ 1`/);
  assert.match(locator, /widen\s+once up to the section range/);
  assert.match(locator, /Do not crawl by shifting\s+offsets line by\s+line/);
  assert.match(locator, /Linked or related page/);
  assert.match(locator, /run `\+grep --paths '\["<new-page>"\]'`/);
  assert.match(locator, /No reliable range/);
  assert.match(locator, /call\s+`\+read --outline`/);
  assert.doesNotMatch(locator, /On a long page/);
});

test('workflow accepts bare read only after complete response evidence', () => {
  const locator = sectionBetween(
    workflow,
    '3. **Choose the section locator.**',
    '4. **Read the selected window.**',
  );
  assert.match(locator, /startLine: 1/);
  assert.match(locator, /endLine: totalLines/);
  assert.match(locator, /truncated: false/);
  assert.match(workflow, /do not\s+shell-truncate with `\| head`/);
});

test('workflow requires subquestion coverage before answering', () => {
  const assess = sectionBetween(
    workflow,
    '5. **Assess coverage, then answer or iterate.**',
    '## Anti-pattern: same-page offset crawling',
  );
  assert.match(assess, /Map the user's question into\s+subquestions/);
  assert.match(assess, /every answered subquestion is supported by read sections/);
  assert.match(assess, /not covered by the knowledge base/);
  assert.match(assess, /do not\s+attach a confident value from general knowledge/);
});

test('workflow treats catalog pages as navigation, not answer sources', () => {
  const steps = sectionBetween(
    workflow,
    '1. **Index the candidate.**',
    '3. **Choose the section locator.**',
  );
  // 两级导航：根 index 只路由到模块级，模块粒度不够时读 catalog 取明细页路径
  assert.match(steps, /routes at module level only/);
  assert.match(steps, /module's catalog page\s+\(`wiki\/modules\/<module>\/catalog\.md`\)/);
  assert.match(steps, /catalog itself is\s+navigation, not an answer source/);
  // pageKind 消费：grep 撞到 catalog 时提取子页路径，catalog 非读取终点
  assert.match(steps, /pageKind: "catalog"` marks a module directory page/);
  assert.match(steps, /add the\s+detail-page paths you see there to your read list/);
  assert.match(steps, /instead of reading the\s+catalog as an answer source/);
});

test('source deletion discovers an exact source ID first and keeps legacy compatibility explicit', () => {
  const sourceFlow = sectionBetween(
    skill,
    '### List Sources',
    '### Delete a Knowledge Base',
  );
  assert.match(sourceFlow, /ae-cli kb \+list-sources --name/);
  assert.match(sourceFlow, /exact `id`/);
  assert.match(sourceFlow, /ae-cli kb \+rm-source[\s\S]*--id/);
  assert.match(sourceFlow, /legacy compatibility/i);
  assert.match(sourceFlow, /do not guess (?:a )?source ID/i);
  assert.match(sourceFlow, /high-risk-write/);
  assert.match(sourceFlow, /Transition status: transitional/);
});

test('English and Chinese READMEs document ID-first source deletion and the legacy flag', () => {
  for (const documentation of [
    readme,
    readmeZh,
    openSourceReadme,
    openSourceReadmeZh,
  ]) {
    assert.match(documentation, /ae-cli kb \+list-sources --name/);
    assert.match(documentation, /ae-cli kb \+rm-source[^\n]*--id/);
    assert.match(documentation, /--display-name/);
  }
  assert.match(readme, /legacy compatibility/i);
  assert.match(readmeZh, /兼容旧命令/);
});

test('ae-kb skill contract > documents compile and schema model references', () => {
  const management = sectionBetween(
    skill,
    '### Generate Schema and Compile',
    '### Check Knowledge Base Status',
  );
  assert.match(management, /ae-cli agent \+list-models/);
  assert.match(management, /model record `id`/);
  assert.match(management, /`modelId`/);
  assert.match(management, /`modelId::scope`/);
  assert.match(management, /ae-cli kb \+schema[\s\S]*--model <model-ref>/);
  assert.match(management, /ae-cli kb \+compile[\s\S]*--model <model-ref>/);
  assert.doesNotMatch(management, /model display name/i);
});

test('ae-kb skill contract > documents read expansion and the 2000 line limit', () => {
  const read = sectionBetween(skill, '### `+read`', '### `+new`');
  assert.match(read, /--expand block\|none/);
  assert.match(read, /1-2000/);
  assert.doesNotMatch(read, /10000/);
  assert.match(workflow, /--expand block/);
  assert.match(workflow, /--expand none/);
});

test('ae-kb skill contract > documents optional exact scope for every name-based management command', () => {
  for (const command of [
    'add',
    'url',
    'schema',
    'compile',
    'status',
    'list-sources',
    'rm-source',
    'remove',
  ]) {
    assert.match(
      skill,
      new RegExp(`ae-cli kb \\+${command}[^\\n]*\\[--scope personal\\|company\\]`),
      `${command} must document optional personal/company scope`,
    );
  }
});

test('ae-kb skill contract > excludes the retired kb +query command', () => {
  for (const documentation of [
    skill,
    workflow,
    readme,
    readmeZh,
    openSourceReadme,
    openSourceReadmeZh,
  ]) {
    assert.doesNotMatch(documentation, /\bae-cli kb \+query\b/);
  }
});

console.log('All kb skill query workflow tests passed.');
