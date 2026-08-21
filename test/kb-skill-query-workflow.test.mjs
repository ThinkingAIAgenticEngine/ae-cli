import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(path.join(ROOT, 'skills/ae-kb/SKILL.md'), 'utf8');
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

test('workflow chooses read windows by observable branch', () => {
  const locator = sectionBetween(
    workflow,
    '3. **Choose the section locator.**',
    '4. **Read the selected window.**',
  );
  assert.match(locator, /Same-page grep hit/);
  assert.match(locator, /read a bounded window anchored at `line`/);
  assert.match(locator, /stay\s+within `sectionStartLine`–`sectionEndLine`/);
  assert.match(workflow, /whole section context/);
  assert.match(workflow, /maximum boundary when choosing a smaller window/);
  assert.match(locator, /`--offset sectionStartLine`/);
  assert.match(locator, /`--limit sectionEndLine - sectionStartLine \+ 1`/);
  assert.match(locator, /widen once up to the section range/);
  assert.match(locator, /Do not crawl by shifting\s+offsets line by line/);
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
  assert.match(assess, /say which subquestion is\s+not covered/);
  assert.match(assess, /instead of filling it from memory/);
});

console.log('All kb skill query workflow tests passed.');
