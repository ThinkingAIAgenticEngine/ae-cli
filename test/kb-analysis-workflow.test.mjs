import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = readFileSync(
  path.join(ROOT, 'skills/ae-kb/references/analysis-workflow.md'),
  'utf8',
);
const kbSkill = readFileSync(path.join(ROOT, 'skills/ae-kb/SKILL.md'), 'utf8');
const discoverySkill = readFileSync(
  path.join(ROOT, 'skills/ae-kb-discovery/SKILL.md'),
  'utf8',
);
const analysisSkill = readFileSync(
  path.join(ROOT, 'skills/ae-analysis/SKILL.md'),
  'utf8',
);

assert.match(workflow, /does not define knowledge-base compilation rules/);
assert.match(
  workflow,
  /Asset-authentication and metric-recommendation review is a separate workflow/,
);

assert.match(workflow, /analysis execution contract/);
assert.match(workflow, /Asset chain/);
assert.match(workflow, /Statistical definition/);
assert.match(workflow, /Saved parameters/);
assert.match(workflow, /Time contract/);
assert.match(workflow, /Decision boundaries/);

assert.match(workflow, /Choose the most specific executable asset/);
assert.match(workflow, /recall card's primary dashboard is a routing prior/);
assert.match(workflow, /one targeted `\+grep` call against the relevant detail-asset directory/);
assert.match(workflow, /Rank candidates by semantic coverage/);
assert.match(workflow, /one parameterized saved report that produces all requested variants/);
assert.match(workflow, /Do not substitute an account ID/);
assert.match(workflow, /one-way events versus combined inbound and outbound events/);

assert.match(
  workflow,
  /exact asset identified by a source page takes priority over fuzzy search and\s+ad-hoc analysis/,
);
assert.match(workflow, /analysis report get/);
assert.match(workflow, /ae-analysis\/references\/report_data_run\.md/);
assert.match(workflow, /analysis report-data run/);
assert.match(workflow, /--sql-params/);
assert.match(workflow, /Dashboard generic filter or\s+time overrides do not apply to SQL reports/);
assert.match(
  workflow,
  /KB contains definitions but not current values[\s\S]*matched saved asset must be attempted first/,
);

assert.match(workflow, /Preserve authored parameter semantics/);
assert.match(workflow, /cannot be replaced with `is_dev=false`/);
assert.match(workflow, /live asset differs from the KB snapshot/);
assert.match(workflow, /is a conflict: stop\s+the affected conclusion/);

assert.match(
  workflow,
  /None of these conditions alone authorizes an ad-hoc or SQL reconstruction/,
);
assert.match(workflow, /exact saved asset has not yet been attempted/);
assert.match(workflow, /exact saved asset returns an empty result/);
assert.match(workflow, /Permission denial:/);
assert.match(
  workflow,
  /Permission denial on a dashboard or report is not, by itself, a prohibition\s+on ad-hoc analysis/,
);
assert.match(workflow, /events, metrics, properties, metadata/);
assert.match(workflow, /Capability unavailable/);
assert.match(workflow, /Fixed historical window/);
assert.match(workflow, /Technical success is not semantic correctness/);
assert.match(
  workflow,
  /The KB path is preferred, not exclusive/,
);
assert.match(
  workflow,
  /continue as though no\s+executable KB asset had been found/,
);
assert.match(workflow, /Search for another accessible saved report or dashboard/);
assert.match(workflow, /use ad-hoc analysis only when the normal\s+`ae-analysis` rules permit it/);
assert.match(workflow, /permission is independently enforced by the backend/);
assert.match(workflow, /The user does not need to restate the original data request/);
assert.match(workflow, /Never claim that the KB\s+asset produced a fallback result/);

assert.match(kbSkill, /read and follow \[`references\/analysis-workflow\.md`\]/);
assert.match(kbSkill, /This is mandatory/);
assert.match(
  discoverySkill,
  /read and follow the `ae-kb` skill's \[`references\/analysis-workflow\.md`\]/,
);
assert.match(discoverySkill, /attempting the matched saved asset first/);
assert.match(
  analysisSkill,
  /read and follow \[`\.\.\/ae-kb\/references\/analysis-workflow\.md`\]/,
);
assert.match(analysisSkill, /Attempt the matched asset before using the ordinary fallback/);

console.log('KB-guided analysis workflow contract passed.');
