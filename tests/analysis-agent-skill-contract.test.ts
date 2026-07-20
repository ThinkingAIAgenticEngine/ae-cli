/** Agent-facing ae-analysis routing and result-semantics regression tests. */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const skill = readFileSync(new URL('../skills/ae-analysis/SKILL.md', import.meta.url), 'utf8');
const dashboardRun = readFileSync(
  new URL('../skills/ae-analysis/references/dashboard_report_data_run.md', import.meta.url),
  'utf8',
);
const reportCreate = readFileSync(new URL('../skills/ae-analysis/references/report_create.md', import.meta.url), 'utf8');
const reportUpdate = readFileSync(new URL('../skills/ae-analysis/references/report_update.md', import.meta.url), 'utf8');
const reportList = readFileSync(new URL('../skills/ae-analysis/references/report_list.md', import.meta.url), 'utf8');
const reportGet = readFileSync(new URL('../skills/ae-analysis/references/report_get.md', import.meta.url), 'utf8');
const reportDataRun = readFileSync(new URL('../skills/ae-analysis/references/report_data_run.md', import.meta.url), 'utf8');
const reportDataExport = readFileSync(new URL('../skills/ae-analysis/references/report_data_export.md', import.meta.url), 'utf8');
const adhocRun = readFileSync(new URL('../skills/ae-analysis/references/adhoc_run.md', import.meta.url), 'utf8');
const adhocExport = readFileSync(new URL('../skills/ae-analysis/references/adhoc_export.md', import.meta.url), 'utf8');
const runInspect = readFileSync(new URL('../skills/ae-analysis/references/run_inspect.md', import.meta.url), 'utf8');
const artifactDownload = readFileSync(new URL('../skills/ae-analysis/references/artifact_download.md', import.meta.url), 'utf8');
const assetUrl = readFileSync(new URL('../skills/ae-analysis/references/asset_url_get.md', import.meta.url), 'utf8');
const aiModels = readFileSync(new URL('../skills/ae-analysis/references/ai_models.md', import.meta.url), 'utf8');
const commandIndex = readFileSync(
  new URL('../skills/ae-analysis/references/command_index.md', import.meta.url),
  'utf8',
);
const capabilitySkill = readFileSync(
  new URL('../skills/ae-capability/SKILL.md', import.meta.url),
  'utf8',
);
const capabilityCommandSource = readFileSync(
  new URL('../src/commands/capability/index.ts', import.meta.url),
  'utf8',
);

assert.match(skill, /search only the matching row/);
assert.match(skill, /do not read the exhaustive index end to end/);
assert.match(skill, /native `analysis user-tag \.\.\.` and `analysis user-cluster \.\.\.`/);
assert.doesNotMatch(skill, /analysis_audience/);

assert.match(skill, /`ok: true` with empty data is success/);
assert.match(skill, /Never relabel an empty report\/dashboard result as query failure/);
assert.match(skill, /`meta\.partial: true` is partial success/);
assert.match(skill, /`meta\.request_id`, `meta\.invocation_id`, `meta\.stage`/);
assert.match(skill, /Do not retry an unchanged failed command/);
assert.match(skill, /ae-cli generates.*request_id.*before dispatch/i);
assert.match(skill, /Probe the first page exactly once/);
assert.match(skill, /continue only with the returned `next_offset` while `has_more` is true/);
assert.match(skill, /Never resubmit an identical invocation while it is still in flight/);
assert.match(skill, /Retry only the items named in `meta\.failures`/);
assert.match(skill, /successful or empty items/);
assert.match(skill, /module × model × outcome/);
assert.match(skill, /最近7天.*`mode=recent`.*`recentDay=0-7`.*含今天/);
assert.match(skill, /过去7天.*`mode=previous`.*`recentDay=1-7`.*不含今天/);

assert.match(dashboardRun, /empty dashboard batch or report result with no rows is a successful query/i);
assert.doesNotMatch(dashboardRun, /selected report IDs return no entries.*fails/i);

assert.match(reportCreate, /SQL dynamic parameter/);
assert.match(reportCreate, /query the saved default first/);
assert.match(reportCreate, /`report_id` returned by this exact create response/);
assert.match(reportUpdate, /read the current `version` exactly once/);
assert.match(reportUpdate, /query the saved default before applying an override/);
assert.match(reportList, /narrow with `--query` or `--model-types` before paging/);
assert.match(reportList, /do not enumerate every report page/);
assert.match(reportGet, /agent-facing `time_particle_size`/);
assert.match(reportGet, /internal `T0` through `T9` codes must never leak/);
assert.match(reportGet, /Do not infer a granularity/);

assert.match(reportDataRun, /omit `--sql-params` to execute the saved default/);
assert.match(reportDataRun, /then make one second call with `--sql-params`/);
assert.match(reportDataRun, /"recent_day":"1-7"/);
assert.doesNotMatch(reportDataRun, /"recent_day":"past7"/);
assert.match(reportDataExport, /same export response/);

assert.match(adhocRun, /SQL text requests `LIMIT 2000`/);
assert.match(adhocRun, /go directly to `analysis adhoc export`/);
assert.match(adhocRun, /Do not lower the SQL limit to 1000/);
assert.match(adhocExport, /Preserve the `run_id` and `artifact_id` from this exact submit response/);
assert.match(runInspect, /same export response/);
assert.match(artifactDownload, /same export response/);

assert.match(assetUrl, /post-write resource link completion/);
assert.match(assetUrl, /`raw_url` plus `markdown_link`/);
assert.match(aiModels, /`tag_name` is the only tag-report name field/);
assert.match(aiModels, /最近7天.*近7天.*"mode":"recent".*`recentDay=0-7`.*是/);
assert.match(aiModels, /过去7天.*前7天.*"mode":"previous".*`recentDay=1-7`.*否/);
assert.match(aiModels, /`second`: `1\.\.999`/);
assert.match(aiModels, /`minute`: `1\.\.999`/);
assert.match(aiModels, /`hour`: `1\.\.24`/);
assert.match(aiModels, /Do not use `day`.*`session_interval=24`.*`session_unit=hour`/);
assert.match(aiModels, /never relabel it as `user_property`/);
assert.match(commandIndex, /global filters support user_property, cluster, and tag only/);
assert.match(commandIndex, /express one day as session_interval=24 and session_unit=hour/);
assert.doesNotMatch(capabilitySkill, /sql-write .*--yes/);
assert.doesNotMatch(capabilityCommandSource, /dashboard\.list .*--yes/);

const commandRows = [...commandIndex.matchAll(
  /^\| `([^`]+)` \| [^|]+ \| (read|write|high-risk-write) \|.*\| \[[^\]]+\]\(([^)]+)\) \|$/gm,
)].map((match) => ({ command: match[1], risk: match[2], reference: match[3] }));

for (const row of commandRows.filter(({ risk }) => risk !== 'high-risk-write')) {
  const reference = readFileSync(
    new URL(`../skills/ae-analysis/references/${row.reference}`, import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(
    reference,
    /--yes/,
    `${row.command} is ${row.risk}; its reference must not tell agents to pass --yes`,
  );
}

for (const command of [
  'ae-cli analysis user-cluster delete',
  'ae-cli analysis user-tag delete',
  'ae-cli analysis history-tag clear',
  'ae-cli analysis-governance asset batch-delete',
  'ae-cli analysis-governance rule delete',
]) {
  assert.equal(
    commandRows.find((row) => row.command === command)?.risk,
    'high-risk-write',
    `${command} must use the destructive-operation confirmation gate`,
  );
}

for (const row of commandRows.filter(({ risk }) => risk === 'high-risk-write')) {
  const reference = readFileSync(
    new URL(`../skills/ae-analysis/references/${row.reference}`, import.meta.url),
    'utf8',
  );
  assert.match(reference, /--dry-run/, `${row.command} must preview destructive impact first`);
  assert.match(reference, /explicit user confirmation/i, `${row.command} must wait for explicit confirmation`);
  assert.match(reference, /--yes/, `${row.command} may use --yes only after confirmation`);
}
assert.doesNotMatch(aiModels, /`cluster_name`.*tag-report name field/);

process.stdout.write('analysis agent skill contract tests passed\n');
