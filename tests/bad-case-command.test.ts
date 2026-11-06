import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import commands, { badCaseInput, badCaseSubmit, badCaseReview, badCaseGet } from '../src/commands/te-analysis/bad-case/index.js';
import { baseCommands } from '../src/commands/te-analysis/index.js';
import type { RuntimeContext } from '../src/framework/types.js';

const ctx = (flags: Record<string, unknown>) => ({ str: (key: string) => String(flags[key] ?? '') }) as RuntimeContext;

test('Bad Case review preserves bigint IDs and optional supplement for both decisions', () => {
  for (const decision of ['APPROVE', 'REJECT', 'REVOKE']) {
    assert.deepEqual(badCaseInput('review', badCaseReview.flags, ctx({ 'project-id': 3, 'item-id': '9007199254741001', version: '0', decision, 'client-request-id': 'retry' })),
      { project_id: 3, item_id: '9007199254741001', version: '0', decision, client_request_id: 'retry' });
  }
  assert.throws(() => badCaseInput('get', badCaseGet.flags, ctx({ 'project-id': 3, 'item-id': '9e18' })));
  for (const command of commands) assert.equal(baseCommands.filter(value => value.resource === command.resource && value.command === command.command).length, 1);
});

test('Bad Case file submission accepts empty batches and does not implicitly publish', () => {
  const dir = mkdtempSync(join(tmpdir(), 'badcase-'));
  try {
    const file = join(dir, 'packet.json');
    writeFileSync(file, JSON.stringify({ candidates: [] }));
    const flags = { 'project-id': 3, 'batch-id': '42', 'input-file': file };
    assert.deepEqual(badCaseInput('submit', badCaseSubmit.flags, ctx(flags)), { project_id: 3, batch_id: '42', candidates: [] });
    assert.equal(badCaseInput('submit', badCaseSubmit.flags, ctx({ ...flags, 'submit-to-page': 'true' })).submit_to_page, true);
    writeFileSync(file, JSON.stringify({ candidates: [], project_id: 4 }));
    assert.throws(() => badCaseInput('submit', badCaseSubmit.flags, ctx(flags)));
  } finally { rmSync(dir, { recursive: true }); }
});

test('Bad Case file validates dedup references without implementing semantic matching', () => {
  const dir = mkdtempSync(join(tmpdir(), 'badcase-'));
  try {
    const file = join(dir, 'packet.json');
    const source = { open_id: 'u', agent_session_id: 's', question_id: 'q', answer_id: 'a', days: 7, end_time: '2026-10-29T06:00:00Z' };
    const first = { candidate_id: 'a', source, duplicate_item_id: '9007199254741001', dedup_reason: 'Same underlying defect' };
    const second = { candidate_id: 'b', source: { ...source, question_id: 'q2' }, duplicate_of: 'a', dedup_reason: 'Paraphrase of the same defect' };
    const input = () => badCaseInput('submit', badCaseSubmit.flags, ctx({ 'project-id': 3, 'batch-id': '42', 'input-file': file }));
    writeFileSync(file, JSON.stringify({ candidates: [first, second] }));
    assert.equal((input().candidates as unknown[]).length, 2);
    writeFileSync(file, JSON.stringify({ candidates: [second, first] }));
    assert.throws(input);
  } finally { rmSync(dir, { recursive: true }); }
});
