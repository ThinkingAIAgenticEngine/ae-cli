import assert from 'node:assert/strict';

import { AI_DEFINITION_DESCRIPTION } from '../src/commands/te-analysis/ai-models.js';
import { sqlTableColumns } from '../src/commands/te-analysis/sql-table/columns.js';
import { sqlTableList } from '../src/commands/te-analysis/sql-table/list.js';

assert.match(AI_DEFINITION_DESCRIPTION, /"#user_id"/);
assert.match(AI_DEFINITION_DESCRIPTION, /"\$part_event"/);
assert.match(AI_DEFINITION_DESCRIPTION, /event table/i);
assert.match(AI_DEFINITION_DESCRIPTION, /"\$part_date"/);
assert.match(AI_DEFINITION_DESCRIPTION, /reject/i);
assert.match(AI_DEFINITION_DESCRIPTION, /never auto-quotes identifiers/);
assert.match(sqlTableColumns.description, /"#user_id"/);
assert.match(sqlTableColumns.description, /"\$part_event"/);
assert.match(sqlTableColumns.description, /"\$part_date"/);
assert.match(sqlTableColumns.description, /reject/i);
for (const command of [sqlTableList, sqlTableColumns]) {
  const usage = command.flags.find((flag) => flag.name === 'usage');
  assert.ok(usage);
  assert.match(usage.desc, /tag_cluster/);
}

console.log('analysis SQL special identifier contract tests passed');
