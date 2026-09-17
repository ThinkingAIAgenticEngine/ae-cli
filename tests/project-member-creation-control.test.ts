import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { projectMemberAdd } from '../src/commands/te-analysis/project/member/add.ts';
import { projectMemberCandidateList } from '../src/commands/te-analysis/project/member-candidate/list.ts';

test('project member type flags document config-controlled behavior', () => {
  const addType = projectMemberAdd.flags.find((flag) => flag.name === 'type');
  const candidateType = projectMemberCandidateList.flags.find(
    (flag) => flag.name === 'type',
  );

  assert.match(addType?.desc ?? '', /0 creates a company member/);
  assert.match(addType?.desc ?? '', /1 adds an existing company member/);
  assert.match(candidateType?.desc ?? '', /0 checks new company members/);
  assert.match(
    candidateType?.desc ?? '',
    /may be disabled by company configuration/,
  );
});

test('agent references route disabled type 0 operations through system management', () => {
  for (const reference of [
    'project_member_add.md',
    'project_member_candidate_list.md',
  ]) {
    const content = readFileSync(
      new URL(`../skills/ae-analysis/references/${reference}`, import.meta.url),
      'utf8',
    );

    assert.match(content, /--type 0/);
    assert.match(content, /--type 1/);
    assert.match(content, /system management/i);
  }
});
