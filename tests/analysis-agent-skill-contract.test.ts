/** Agent-facing ae-analysis routing and result-semantics regression tests. */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const skill = readFileSync(new URL('../skills/ae-analysis/SKILL.md', import.meta.url), 'utf8');
const dashboardCreate = readFileSync(
  new URL('../skills/ae-analysis/references/dashboard_create.md', import.meta.url),
  'utf8',
);
const biPanelCreate = readFileSync(
  new URL('../skills/ae-analysis/references/bi_panel_create.md', import.meta.url),
  'utf8',
);
const biPanelUpdate = readFileSync(
  new URL('../skills/ae-analysis/references/bi_panel_update.md', import.meta.url),
  'utf8',
);
const dashboardRun = readFileSync(
  new URL('../skills/ae-analysis/references/dashboard_report_data_run.md', import.meta.url),
  'utf8',
);
const dashboardGet = readFileSync(
  new URL('../skills/ae-analysis/references/dashboard_get.md', import.meta.url),
  'utf8',
);
const dashboardUpdate = readFileSync(
  new URL('../skills/ae-analysis/references/dashboard_update.md', import.meta.url),
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
const analysisDataRetrieval = readFileSync(
  new URL('../skills/ae-analysis/references/analysis_data_retrieval.md', import.meta.url),
  'utf8',
);
const drilldownUserEventsRun = readFileSync(
  new URL('../skills/ae-analysis/references/drilldown_user_events_run.md', import.meta.url),
  'utf8',
);
const drilldownUserEventsExport = readFileSync(
  new URL('../skills/ae-analysis/references/drilldown_user_events_export.md', import.meta.url),
  'utf8',
);
const userTagMemberList = readFileSync(
  new URL('../skills/ae-analysis/references/user_tag_member_list.md', import.meta.url),
  'utf8',
);
const userClusterMemberList = readFileSync(
  new URL('../skills/ae-analysis/references/user_cluster_member_list.md', import.meta.url),
  'utf8',
);
const filterValueList = readFileSync(
  new URL('../skills/ae-analysis/references/filter_value_list.md', import.meta.url),
  'utf8',
);
const runInspect = readFileSync(new URL('../skills/ae-analysis/references/run_inspect.md', import.meta.url), 'utf8');
const artifactDownload = readFileSync(new URL('../skills/ae-analysis/references/artifact_download.md', import.meta.url), 'utf8');
const assetUrl = readFileSync(new URL('../skills/ae-analysis/references/asset_url_get.md', import.meta.url), 'utf8');
const aiModels = readFileSync(new URL('../skills/ae-analysis/references/ai_models.md', import.meta.url), 'utf8');
const audienceModels = readFileSync(
  new URL('../skills/ae-analysis/references/audience_models.md', import.meta.url),
  'utf8',
);
const userTagModels = readFileSync(
  new URL('../skills/ae-analysis/references/user_tag_models.md', import.meta.url),
  'utf8',
);
const userTagCreate = readFileSync(
  new URL('../skills/ae-analysis/references/user_tag_create.md', import.meta.url),
  'utf8',
);
const metadataResolution = readFileSync(
  new URL('../skills/ae-analysis/metadata_resolution.md', import.meta.url),
  'utf8',
);
const commandIndex = readFileSync(
  new URL('../skills/ae-analysis/references/command_index.md', import.meta.url),
  'utf8',
);
const personalSemanticList = readFileSync(
  new URL('../skills/ae-analysis/references/personal_semantic_preference_list.md', import.meta.url),
  'utf8',
);
const personalSemanticAdd = readFileSync(
  new URL('../skills/ae-analysis/references/personal_semantic_preference_add.md', import.meta.url),
  'utf8',
);
const personalSemanticGet = readFileSync(
  new URL('../skills/ae-analysis/references/personal_semantic_preference_get.md', import.meta.url),
  'utf8',
);
const projectTimezoneUpdate = readFileSync(
  new URL('../skills/ae-analysis/references/project_timezone_update.md', import.meta.url),
  'utf8',
);
const superMetadataBatchCreate = readFileSync(
  new URL('../skills/ae-analysis/references/super_metadata_batch_create.md', import.meta.url),
  'utf8',
);
const propertyCreate = readFileSync(
  new URL('../skills/ae-analysis/references/property_create.md', import.meta.url),
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
const analysisToolsDoc = readFileSync(
  new URL('../docs/te-analysis/te-analysis-mcp-tools.md', import.meta.url),
  'utf8',
);

assert.match(skill, /Map the request to a command family before opening any reference/);
assert.match(skill, /retention request goes directly to `references\/adhoc_run\.md`.*`retention` section.*`references\/ai_models\.md`/i);
assert.match(skill, /`command_index\.md` is a search-only fallback/);
assert.match(skill, /never open it with a whole-file read or print the entire file/i);
assert.match(skill, /analysis boards, BI dashboards/);
assert.match(skill, /native `analysis user-tag \.\.\.` and `analysis user-cluster \.\.\.`/);
assert.match(skill, /member list commands are the exception: omission defaults to 1000 rows/);
assert.doesNotMatch(skill, /analysis_audience/);

assert.match(skill, /`ok: true` with empty data is success/);
assert.match(skill, /Never relabel an empty report\/dashboard result as query failure/);
assert.match(skill, /`meta\.partial: true` is partial success/);
assert.match(skill, /`meta\.request_id`, `meta\.invocation_id`, `meta\.stage`/);
assert.match(skill, /Do not retry an unchanged failed command/);
assert.match(skill, /once per host.*user.*project.*conversation/i);
assert.match(skill, /asset_context.*resource_type.*resource_key.*display_name/is);
assert.match(skill, /ae-cli generates.*request_id.*before dispatch/i);
assert.match(skill, /Probe the first page exactly once/);
assert.match(skill, /continue only with the returned `next_offset` while `has_more` is true/);
assert.match(skill, /Never resubmit an identical invocation while it is still in flight/);
assert.match(skill, /Retry only the items named in `meta\.failures`/);
assert.match(skill, /successful or empty items/);
assert.match(skill, /module × model × outcome/);
assert.match(skill, /最近7天.*`mode=recent`.*`recentDay=0-7`.*含今天/);
assert.match(skill, /过去7天.*`mode=previous`.*`recentDay=1-7`.*不含今天/);
assert.match(skill, /`看板`.*`ae-cli analysis dashboard \.\.\.`.*`analysis\.dashboard\.\*`/);
assert.match(skill, /`仪表盘`.*`BI 仪表盘`.*`ae-cli analysis bi-panel \.\.\.`.*`analysis\.bi_panel\.\*`/);
assert.match(skill, /standalone English word `dashboard` is ambiguous/);
assert.match(skill, /Do not fall back to creating an analysis board/);
assert.match(skill, /Tag\/cluster candidate values.*`cluster_date_policy=LATEST`/i);
assert.match(skill, /latest computed data snapshot.*never.*definition or configuration release/i);
assert.match(skill, /structured AI-QP metadata failures/);
assert.match(skill, /`allowed_resource_types` is authoritative/);
assert.match(skill, /Never use a candidate.*without user confirmation/);
assert.match(skill, /compiler candidates already exist.*confirm without another metadata call/i);
assert.match(skill, /one discovery budget per host, project, authenticated principal, and Agent conversation/i);
assert.match(skill, /successful remote search round with no confirmable candidate consumes one miss/i);
assert.match(skill, /candidate stops discovery and requires user confirmation.*not a miss/i);
assert.match(skill, /Validation, permission, network, and server errors.*do not consume.*must not trigger a full export/i);
assert.match(skill, /After at most two ordinary miss rounds, the third remote discovery round must be one aggregate/i);
assert.match(skill, /Once a valid complete catalog exists, do not call online resource-specific metadata list\/search commands or `analysis-meta catalog list\|export` again/i);
assert.match(metadataResolution, /Treat that complete error array as one resolution plan/i);
assert.match(metadataResolution, /Ordinary discovery workflow/);
assert.match(metadataResolution, /Project lookup, exact `get`, filter-value lookup, and data queries do not consume/i);
assert.match(metadataResolution, /third remote metadata-discovery round must be exactly one aggregate search/i);
assert.match(metadataResolution, /at most two resource-specific misses followed by one aggregate catalog search/i);
assert.match(metadataResolution, /Errors never advance that counter/i);
assert.match(metadataResolution, /exact `get` for details not present in the catalog remains outside the discovery budget/i);
assert.match(metadataResolution, /one JSONL file/i);
assert.match(metadataResolution, /ae-cli analysis-meta catalog list/);
assert.match(metadataResolution, /exactly one aggregate online search/i);
assert.match(metadataResolution, /union of those paths' `allowed_resource_types`/i);
assert.match(metadataResolution, /--resource-types/);
assert.match(metadataResolution, /If any searched path still has no candidate, download the complete catalog exactly once/i);
assert.match(metadataResolution, /Do not call event, property, metric, cluster, or tag list commands/i);
assert.match(metadataResolution, /Do not run `--queries` synonym rounds/i);
assert.match(metadataResolution, /never call `analysis-meta catalog list` again/i);
assert.match(metadataResolution, /current Agent conversation context as the catalog base/i);
assert.match(metadataResolution, /<agent-conversation-root>\/ae-cli\/analysis-metadata/);
assert.match(metadataResolution, /Do not assume a product-specific environment variable/i);
assert.match(metadataResolution, /mktemp -d/);
assert.match(metadataResolution, /first 16 lowercase hex characters.*SHA-256/i);
assert.match(metadataResolution, /mode `0700`/);
assert.match(metadataResolution, /Keep the original definition unchanged/i);
assert.match(metadataResolution, /one `resolutions` object keyed by compiler path/i);
assert.match(metadataResolution, /reject-all response is a state transition, not task cancellation/i);
assert.match(metadataResolution, /Never repeat candidates the user already rejected/i);
assert.match(metadataResolution, /RESOLUTION_STALE.*RESOLUTION_TYPE_NOT_ALLOWED.*RESOLUTION_PATH_INVALID/i);
assert.match(dashboardCreate, /analysis board \(`看板`\)/);
assert.match(dashboardCreate, /Do not use for a BI dashboard \(`仪表盘`\)/);
assert.match(biPanelCreate, /BI dashboard \(`仪表盘`\)/);
assert.match(biPanelCreate, /Do not use for an analysis board \(`看板`\)/);
assert.match(biPanelCreate, /empty BI-dashboard shell only/i);
assert.match(
  biPanelCreate.replace(/\s+/g, ' '),
  /does not create pages, charts, worksheets, draft content, or released content/i,
);
assert.doesNotMatch(biPanelCreate, /--panel-uuid|--payload/);
assert.match(biPanelUpdate, /rename a BI dashboard/i);
assert.match(
  biPanelUpdate.replace(/\s+/g, ' '),
  /does not modify pages, charts, worksheets, draft content, or released content/i,
);
assert.doesNotMatch(biPanelUpdate, /--payload/);

assert.match(dashboardRun, /empty dashboard batch or report result with no rows is a successful query/i);
assert.doesNotMatch(dashboardRun, /selected report IDs return no entries.*fails/i);
assert.match(dashboardRun, /run `ae-cli analysis dashboard get` exactly once/i);
assert.match(dashboardRun, /folder_name.*dashboard_name.*notes/is);
assert.match(dashboardGet, /location.*space_id.*space_name.*folder_id.*folder_name/is);
assert.match(dashboardGet, /notes.*note_id.*note_title.*description/is);
assert.match(dashboardGet, /effective_settings.*approximate_calculation.*fixed_timezone.*scheduled_precompute.*cache/is);
assert.match(dashboardGet, /filter_config.*fixed_time.*dashboard_default.*dashboard_business.*space_business/is);
assert.match(dashboardGet, /saved filters as already applied.*do not copy them into `--filters`/is);
assert.match(dashboardGet, /supported=false.*could not be fully mapped/is);
assert.match(dashboardUpdate, /operation=default-filter.*dashboard-wide default filter/is);
assert.match(skill, /Before querying a selected dashboard's report data.*dashboard get/is);
assert.match(skill, /folder_name.*dashboard_name.*notes/is);
assert.match(skill, /effective_settings.*filter_config.*already applied.*AND/is);
assert.match(adhocRun, /--timeout-seconds` defaults to 120 and has a maximum of 180/);
assert.match(adhocRun, /path.*per path level.*`more`/i);
assert.match(adhocRun, /returned_rows.*real business nodes.*excludes synthesized.*more/is);
assert.match(aiModels, /path.*per path level.*returned_rows.*real business nodes.*excludes synthesized.*more/is);
assert.match(analysisToolsDoc, /analysis adhoc run[^\n]*Default timeout is 120 seconds/i);
assert.match(analysisToolsDoc, /analysis bi-panel-page-data run[^\n]*defaults to 120 seconds/i);

assert.match(reportCreate, /SQL dynamic parameter/);
assert.match(reportCreate, /"use_timezone":true/);
assert.match(reportCreate, /definition field.*`--sql-params`/i);
assert.match(reportCreate, /query the saved default first/);
assert.match(reportCreate, /`report_id` returned by this exact create response/);
assert.match(reportCreate, /--resolutions.*not supported with `--model-type tag`/i);
assert.match(reportUpdate, /read the current `version` exactly once/);
assert.match(reportUpdate, /resolutions.*not supported with `model_type=tag`/i);
assert.match(reportUpdate, /query the saved default before applying an override/);
assert.match(reportList, /group known names into one `--queries` call or narrow with `--model-types`/);
assert.match(reportList, /do not issue one list call per name/);
assert.match(reportGet, /agent-facing `time_particle_size`/);
assert.match(reportGet, /internal `T0` through `T9` codes must never leak/);
assert.match(reportGet, /Do not infer a granularity/);
assert.match(aiModels, /reserved word/i);
assert.match(aiModels, /SELECT \"end\"/);
assert.match(aiModels, /real line break/i);
assert.match(aiModels, /literal `\\\\n`/);

assert.match(reportDataRun, /omit `--sql-params` to execute the saved default/);
assert.match(reportDataRun, /then make one second call with `--sql-params`/);
assert.match(reportDataRun, /"recent_day":"1-7"/);
assert.match(reportDataRun, /`effective_zone_offset`/);
assert.match(reportDataRun, /resolved current-user timezone.*project default/);
assert.doesNotMatch(reportDataRun, /"recent_day":"past7"/);
assert.match(reportDataExport, /same export response/);

assert.match(analysisDataRetrieval, /ordinary query, omit `--use-cache`/i);
assert.match(analysisDataRetrieval, /allows a cache read but does not prove.*actually hit/is);
assert.match(analysisDataRetrieval, /fresh data.*refresh or recomputation.*bypass\/disable cache/is);
assert.match(analysisDataRetrieval, /"latest" or "current".*data freshness.*time window/is);
assert.match(analysisDataRetrieval, /freshly refreshed analysis UI.*`--use-cache false`/is);
assert.match(analysisDataRetrieval, /differs from the analysis UI.*exactly once.*`--use-cache false`/is);
assert.match(analysisDataRetrieval, /Never infer\s+a demo scenario/i);
assert.match(analysisDataRetrieval, /Do not claim cache hit or miss unless.*explicit backend evidence/is);

assert.match(adhocRun, /current runtime synchronous maximum/);
assert.match(adhocRun, /go directly to `analysis adhoc export`/);
assert.match(adhocRun, /Do not lower the requested row count/);
assert.match(adhocExport, /Preserve the `run_id` and `artifact_id` from this exact submit response/);
assert.match(drilldownUserEventsRun, /scope=total[\s\S]*machine date coordinates[\s\S]*time granularity/i);
assert.match(drilldownUserEventsRun, /Do not\s+invent `target_dates`/);
assert.match(drilldownUserEventsRun, /force a daily granularity/i);
assert.match(drilldownUserEventsExport, /scope=total[\s\S]*machine date coordinates[\s\S]*time granularity/i);
assert.match(drilldownUserEventsExport, /force a daily granularity/i);
assert.match(userTagMemberList, /Omit `--preview-rows` to return at most 1000 rows/);
assert.match(userClusterMemberList, /Omit `--preview-rows` to return at most 1000 rows/);
assert.match(filterValueList, /LATEST.*latest available computed result snapshot/i);
assert.match(filterValueList, /not a tag definition or configuration release/i);
assert.match(filterValueList, /查询标签 X 最新版本\/最新结果有哪些值/);
assert.match(runInspect, /same export response/);
assert.match(artifactDownload, /same export response/);

assert.match(assetUrl, /post-write resource link completion/);
assert.match(personalSemanticList, /HOT_160_PLUS_RECENT_40/);
assert.match(personalSemanticList, /resource_ref_count.*resource_types/is);
assert.doesNotMatch(personalSemanticList, /data\.items\[\].*heat.*freshness/i);
assert.match(personalSemanticAdd, /--resource-refs/);
assert.match(personalSemanticAdd, /data\.preference/);
assert.match(personalSemanticGet, /data\.preference/);
assert.match(projectTimezoneUpdate, /timezone_toggle.*\{"toggle":true\}/s);
assert.match(projectTimezoneUpdate, /`time_zone_enabled` response field is not accepted/);
assert.match(superMetadataBatchCreate, /single project function permission `editSuperMeta`/);
assert.match(superMetadataBatchCreate, /zh-CN permission UI.*`元数据管理 > 编辑`/);
assert.match(superMetadataBatchCreate, /do not describe the two capability IDs as two separate permissions/i);
assert.match(propertyCreate, /same project permission used by `metadata\.super_metadata\.batch_create`/);
assert.match(assetUrl, /`raw_url` plus `markdown_link`/);
assert.match(aiModels, /`tag_name` is the only tag-report name field/);
assert.match(aiModels, /最近7天.*近7天.*"mode":"recent".*`recentDay=0-7`.*是/);
assert.match(aiModels, /过去7天.*前7天.*"mode":"previous".*`recentDay=1-7`.*否/);
assert.match(audienceModels, /Today.*"mode":"recent","unit":"day","value":1/);
assert.match(audienceModels, /This month.*"mode":"recent","unit":"month","value":1/);
assert.match(audienceModels, /fixed date through today.*"mode":"start_to_today","start_time":"2026-07-01"/i);
assert.match(audienceModels, /fixed date through yesterday.*"mode":"start_to_yesterday","start_time":"2026-07-01"/i);
assert.match(audienceModels, /Do not pass backend `recent_day` encodings inside `time_range`/);
assert.doesNotMatch(audienceModels, /\b(?:M0|W0|Q0|Y0|StartToNow|StartToYesterday)\b/);
assert.match(userTagModels, /first_last[\s\S]*"mode":"recent","unit":"month","value":1/);
assert.match(userTagModels, /first_last[\s\S]*"mode":"start_to_today","start_time":"2026-07-01"/);
assert.match(userTagCreate, /First\/last tag for this month/);
assert.match(userTagCreate, /"mode":"recent","unit":"month","value":1/);
assert.match(aiModels, /`second`: `1\.\.999`/);
assert.match(aiModels, /`minute`: `1\.\.999`/);
assert.match(aiModels, /`hour`: `1\.\.24`/);
assert.match(aiModels, /Do not use `day`.*`session_interval=24`.*`session_unit=hour`/);
assert.match(aiModels, /never relabel it as `user_property`/);
assert.match(aiModels, /`use_timezone`.*boolean.*default.*`false`/i);
assert.match(aiModels, /only valid for `part_date`/i);
assert.match(aiModels, /Distribution filters must be attached to the corresponding `distribution_metrics\[\]\.filters`/);
assert.match(aiModels, /`event`: without property use `total_count`, `user_count`, or `per_user_count`/);
assert.match(aiModels, /`retention` simultaneous metrics: without property use `total_count`, `user_count`, or `per_user_count`/);
assert.match(aiModels, /Initial-event and return-event property filters use the retention-specific shape/i);
assert.match(aiModels, /Do not use top-level `filters`, `retention\.filters`, or `initial_event_filters`/);
const retentionFilterExampleMatch = aiModels.match(
  /Initial-event and return-event property filters use the retention-specific shape[\s\S]*?```json\n([\s\S]*?)\n```/i,
);
assert.ok(retentionFilterExampleMatch, 'retention filter example must contain a JSON block');
const retentionFilterExample = JSON.parse(retentionFilterExampleMatch[1]) as {
  retention: {
    initial_filters: Array<{ event_property_name: string }>;
    initial_filter_relation: string;
    return_filters: Array<{ event_property_name: string }>;
    return_filter_relation: string;
  };
};
assert.equal(retentionFilterExample.retention.initial_filters[0]?.event_property_name, 'case_id');
assert.equal(retentionFilterExample.retention.initial_filter_relation, 'and');
assert.equal(retentionFilterExample.retention.return_filters[0]?.event_property_name, 'case_id');
assert.equal(retentionFilterExample.retention.return_filter_relation, 'and');
assert.match(aiModels, /`distribution`: without property use `count`, `active_days`, or `active_hours`/);
assert.match(aiModels, /`attribution`: use `total_count` without `target_property`, or `sum` with a numeric `target_property`/);
assert.match(aiModels, /`prop_analysis`: use `user_count` without property/);
assert.match(aiModels, /`heat_map`, `rank_list`, and `revenue`/);
assert.match(aiModels, /except that `percentile` is not supported/);
assert.doesNotMatch(aiModels, /Distribution count-like metrics:.*`total_count`/);
assert.doesNotMatch(aiModels, /"target_aggregation": "user_count"/);
assert.match(aiModels, /Do not use top-level `filters` or `relation` in a distribution definition/);
assert.match(commandIndex, /global filters support user_property, cluster, and tag only/);
assert.match(commandIndex, /express one day as session_interval=24 and session_unit=hour/);
assert.match(commandIndex, /Search-only fallback/);
assert.match(commandIndex, /Never load or print this exhaustive file in full/);
assert.match(adhocRun, /validate that exact definition once.*run the same definition once/is);
assert.match(adhocRun, /Never execute a simplified variant that omits requested filters or groups/i);
assert.match(adhocRun, /inspect this command's model contract or capability schema once/i);
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
  'ae-cli analysis user-cluster update',
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
