/** Agent-facing ae-analysis routing and result-semantics regression tests. */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseCommands as analysisCommands } from '../src/commands/te-analysis/index.js';
import personalSemanticCommands from '../src/commands/personal-semantic-preference/index.js';

const skillsRoot = fileURLToPath(new URL('../skills/', import.meta.url));
const analysisRoot = join(skillsRoot, 'ae-analysis');
for (const command of [...analysisCommands, ...personalSemanticCommands]) {
  const resource = ['project', 'system'].includes(command.service)
    ? `${command.service} ${command.resource}`
    : command.resource;
  const name = (resource ? `${resource}_${command.command}` : `${command.service}_${command.command.replace(/^\+/, '')}`)
    .replaceAll('-', '_').replaceAll(/\s+/g, '_');
  const source = readFileSync(join(analysisRoot, 'references', `${name}.md`), 'utf8');
  const declared = [...source.matchAll(/^Capability id:\s*`?([a-z_]+\.[a-z_]+\.[a-z_]+)`?\.?$/gmi)].map((match) => match[1]);
  if (declared.length) assert.ok(declared.includes(command.capabilityId ?? ''), `${name}: missing registered capability ID ${command.capabilityId}`);
}

for (const name of readdirSync(analysisRoot, { recursive: true }).filter((name) => String(name).endsWith('.md'))) {
  const file = join(analysisRoot, String(name));
  for (const [, target] of readFileSync(file, 'utf8').matchAll(/\]\(([^)\n]+)\)/g)) {
    if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
    const linked = resolve(dirname(file), target.split('#')[0]);
    assert.ok(!relative(skillsRoot, linked).startsWith('..'), `${name}: link must be available in the packaged Skills: ${target}`);
    assert.ok(existsSync(linked), `${name}: missing linked file: ${target}`);
  }
}

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
const aiCommon = readFileSync(new URL('../skills/ae-analysis/references/ai_models.md', import.meta.url), 'utf8');
const modelRefs = [...aiCommon.matchAll(/\]\((ai_models\/[^)]+\.md)\)/g)].map((match) => match[1]);
assert.equal(modelRefs.length, 14, 'all supported models have directly readable references');
const modelDocs = modelRefs.map((ref) => readFileSync(join(analysisRoot, 'references', ref), 'utf8'));
const aiModels = [aiCommon, ...modelDocs].join('\n');
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
  new URL('../skills/ae-analysis/references/metadata_resolution.md', import.meta.url),
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
assert.match(skill, /retention request goes directly to.*references\/ai_models\/retention\.md/i);
assert.match(skill, /asset-authentication and metric-recommendation review:.*Open `references\/governance_recommendation_export\.md`/is);
assert.match(skill, /recommend project assets for certification\/authentication/);
assert.match(skill, /review asset-certification recommendations/);
assert.match(skill, /review project asset-governance recommendations/);
assert.match(skill, /build\/update\/refresh\/sync a project semantic knowledge base from a governed asset package/);
assert.match(skill, /recommend project assets for certification\/authentication.*`references\/governance_recommendation_export\.md`/s);
assert.match(skill, /Project semantic knowledge-base build\/update\/refresh\/sync: open `references\/project_semantic_knowledge_wiki\.md`/);
assert.match(skill, /This is a command-reference workflow inside `ae-analysis`, not a standalone project semantic Skill/);
assert.match(skill, /`command_index\.md` is a search-only fallback/);
assert.match(skill, /never open it with a whole-file read or print the entire file/i);
assert.match(skill, /analysis boards, BI dashboards/);
assert.match(skill, /native `analysis user-tag \.\.\.` and `analysis user-cluster \.\.\.`/);
assert.match(analysisDataRetrieval, /member list commands are the exception: omission returns at most 1000 rows/i);
assert.match(analysisDataRetrieval, /Use the tool response directly.*Save original JSON only when the user requests a file or necessary local processing requires one/);
assert.match(analysisDataRetrieval, /If result files already exist, the optional reader/);
assert.doesNotMatch(analysisDataRetrieval, /ae-cli analysis adhoc run[^\n]*>\s*query\.json/);
assert.match(analysisDataRetrieval, /Do not append `; echo "EXIT:\$\?"`/);
assert.doesNotMatch(skill, /analysis_audience/);
assert.match(skill, /asset-authentication and metric-recommendation review.*`analysis-meta governance-recommendation export\|submit\|auto-review\|decisions`/i);
assert.match(skill, /Call `auto-review` only when the user explicitly asks for automatic review or automatic certification/i);
assert.match(skill, /plain recommendation request and a recommendation-plus-page-submission request must not check the automatic certification project config/i);
assert.match(skill, /review-page submission.*agent_review_submit_to_page\.md.*agent-review submit-to-page\|list\|detail\|records\|review\|retry/i);
assert.match(skill, /Common returns the deterministic evidence packet.*Agent owns the fixed human approval display/is);
assert.match(skill, /do not load project semantics, project KB, or personal semantic preferences as a preflight/i);
assert.match(skill, /Do not use project-semantic, project-KB, or personal-semantic-preference commands as prerequisite context/);
assert.match(skill, /open `references\/project_semantic_knowledge_wiki\.md`/);
assert.match(skill, /The retired governed project-semantic candidate and release lifecycle is not part of this knowledge-base build path/);
assert.match(skill, /workflow must not load personal semantic preferences as prerequisite context/);
assert.match(skill, /Do not bypass curated commands with `ae-cli capability inspect\|validate\|dry-run\|run`/);
assert.match(skill, /retired split recommendation command or capability.*routing correction only/is);
assert.match(skill, /business-domain grouping, plain-text status labels, and risk\/conflict explanation/);
assert.match(skill, /Top-level grouping is `业务主题域`/);
assert.match(skill, /Keep the source dashboard as the core evidence package/);
assert.match(skill, /Derive `业务主题域` from the dashboard semantics/);
assert.match(skill, /Do not use raw source titles, test labels, priority labels, asset-type tags, or backend `topic_seed` strings as the final group name/);
assert.match(skill, /`work_units` are evidence containers, not presentation groups/);
assert.match(skill, /A single dashboard\/work unit may split into multiple business domains/);
assert.match(skill, /Keep each report-centered evidence chain together/);
assert.match(skill, /metadata rows, and metric candidates introduced by that report follow the same `业务主题域`/);
assert.match(skill, /one `业务主题域` per child-report business question/);
assert.match(skill, /Do not combine distinct report domains into a broad `A 与 B 运营`/);
assert.match(skill, /Source dashboards and reports are evidence containers/);
assert.match(skill, /Do not create generic groups such as `看板上下文`/);
assert.match(skill, /do not use separate top-level sections like `资产认证建议` and `推荐指标`/);
assert.match(skill, /asset-authentication rows and metric-candidate rows in the same review table/);
assert.match(skill, /Default recommendation export includes completed\/authenticated context/);
assert.match(skill, /place returned `\[已认证\]` and `\[未认证\]` asset rows together/);
assert.match(skill, /not an Agent-side pending-only filter/);
assert.match(skill, /filter out already completed\/authenticated, deferred, or in-flight assets as pending work/);
assert.match(skill, /target about 20-50 pending review assets/);
assert.match(skill, /hard cap around 80/);
assert.match(skill, /overflow left for later batches/);
assert.match(skill, /submit only business domains that still contain pending review assets/);
assert.match(skill, /Do not write long Agent summaries for hidden domains or pure authenticated context/);
assert.match(skill, /preserve optional location facts from Common/);
assert.match(skill, /Not every dashboard belongs to a space/);
assert.match(skill, /missing space fields are valid/);
assert.match(skill, /show asset names as clickable Markdown links/);
assert.match(skill, /first use each asset row's `source_evidence\[\]\.markdown_link`\/`raw_url`/);
assert.match(skill, /for metric rows, use `source_report\.markdown_link`\/`raw_url`/);
assert.match(skill, /Do not strip links from source evidence/);
assert.match(skill, /do not replace linked sources with unlinked generic text/);
assert.match(skill, /`同名看板`/);
assert.match(skill, /bare report names/);
assert.match(skill, /reuse that row's own link as the source evidence/);
assert.match(skill, /Do not show raw asset IDs as the primary object text/);
assert.match(skill, /heat, user count, and impact degree/);
assert.match(skill, /\[已认证\]/);
assert.match(skill, /\[未认证\]/);
assert.match(skill, /\[已有指标资产\]/);
assert.match(skill, /\[推荐指标候选\]/);
assert.match(skill, /\[认证资产候选\]/);
assert.match(skill, /\[风险\/冲突\]/);
assert.match(skill, /Do not use HTML, font tags, color names, or color-dependent wording/);
assert.doesNotMatch(skill, /<font color=/);
assert.doesNotMatch(skill, /status colors/);
assert.doesNotMatch(commandIndex, /asset-authentication dashboard-package/);
assert.doesNotMatch(commandIndex, /metric recommended-scan/);
assert.doesNotMatch(commandIndex, /metric recommended-create/);
assert.match(commandIndex, /## Workflow References/);
assert.match(commandIndex, /Project semantic knowledge-base build\/update\/refresh\/sync/);
assert.match(commandIndex, /project_semantic_knowledge_wiki\.md/);
const governanceRecommendationExport = readFileSync(
  new URL('../skills/ae-analysis/references/governance_recommendation_export.md', import.meta.url),
  'utf8',
);
assert.match(governanceRecommendationExport, /top-level grouping must be `业务主题域`/);
assert.match(governanceRecommendationExport, /Do not call project-semantic, project-KB, or personal-semantic-preference commands as prerequisite context/);
assert.match(governanceRecommendationExport, /must transform the returned `work_units` into business-domain review groups before answering/);
assert.match(governanceRecommendationExport, /Hard output gate/);
assert.match(governanceRecommendationExport, /invalid if it is grouped by asset type, backend array order, raw `work_units`, source dashboard, source report, or separate top-level asset and metric sections/);
assert.match(governanceRecommendationExport, /The command output is evidence, not the response format/);
assert.match(governanceRecommendationExport, /Do not split the final answer into separate top-level sections/);
assert.match(governanceRecommendationExport, /source dashboard as the core evidence package/);
assert.match(governanceRecommendationExport, /Infer each domain from the dashboard semantics/);
assert.match(governanceRecommendationExport, /Treat `work_units` as evidence containers, not presentation groups/);
assert.match(governanceRecommendationExport, /One dashboard\/work unit can split into multiple business domains/);
assert.match(governanceRecommendationExport, /Keep each report-centered evidence chain together/);
assert.match(governanceRecommendationExport, /metadata rows, and metric candidates introduced by that report follow the same `业务主题域`/);
assert.match(governanceRecommendationExport, /one `业务主题域` per child-report business question/);
assert.match(governanceRecommendationExport, /Do not combine distinct report domains into a broad `A 与 B 运营`/);
assert.match(governanceRecommendationExport, /source dashboards and reports as evidence containers/);
assert.match(governanceRecommendationExport, /Never create a generic business-domain group only to place source dashboards/);
assert.match(governanceRecommendationExport, /Do not expose source-only labels as group names/);
assert.match(governanceRecommendationExport, /Strip or ignore prefixes such as acceptance versions, priority markers, asset-type markers/);
assert.match(governanceRecommendationExport, /Asset rows and metric rows must appear in the same table for that domain/);
assert.match(governanceRecommendationExport, /completed\/authenticated context included by default/);
assert.match(governanceRecommendationExport, /certified and uncertified assets from the returned evidence appear together/);
assert.match(governanceRecommendationExport, /Preserve optional dashboard `space_id` \/ `space_name`/);
assert.match(governanceRecommendationExport, /absence is valid because not every dashboard has an owning space/);
assert.match(governanceRecommendationExport, /first use each asset row's `source_evidence\[\]\.markdown_link`\/`raw_url`/);
assert.match(governanceRecommendationExport, /for metric rows, use `source_report\.markdown_link`\/`raw_url`/);
assert.match(governanceRecommendationExport, /keep returned `\[已认证\]` and `\[未认证\]` rows in the same domain table/);
assert.match(governanceRecommendationExport, /do not imply an Agent-side pending-only filter/);
assert.match(governanceRecommendationExport, /fewer than about 10 pending review assets/);
assert.match(governanceRecommendationExport, /fewer than 3 pending business domains/);
assert.match(governanceRecommendationExport, /Apply the daily review capacity after expansion/);
assert.match(governanceRecommendationExport, /target about 20-50 pending review assets/);
assert.match(governanceRecommendationExport, /hard cap around 80/);
assert.match(governanceRecommendationExport, /Record overflow counts and domains for later batches/);
assert.match(governanceRecommendationExport, /Do not display or submit a zero-pending business domain as standalone work/);
assert.match(governanceRecommendationExport, /Do not spend Agent narrative budget on hidden topics or pure authenticated context/);
assert.match(governanceRecommendationExport, /Show asset names, not raw IDs/);
assert.match(governanceRecommendationExport, /When an asset row has `markdown_link`, use that Markdown link as the object text/);
assert.match(governanceRecommendationExport, /Fall back to the work unit's `source_dashboard` or `source_reports` links only when the row has no direct `source_evidence`/);
assert.match(governanceRecommendationExport, /bare report names/);
assert.match(governanceRecommendationExport, /do not replace linked sources with unlinked generic text/);
assert.match(governanceRecommendationExport, /`同名看板`/);
assert.match(governanceRecommendationExport, /reuse that row's own link as the source evidence/);
assert.match(governanceRecommendationExport, /Do not expose raw `resource_key`, dashboard\/report ID/);
assert.match(governanceRecommendationExport, /`heat_count90d`/);
assert.match(governanceRecommendationExport, /`user_count90d`/);
assert.match(governanceRecommendationExport, /`impact_degree`/);
assert.match(governanceRecommendationExport, /`热度\/影响`/);
assert.match(governanceRecommendationExport, /\[已认证\]/);
assert.match(governanceRecommendationExport, /\[未认证\]/);
assert.match(governanceRecommendationExport, /\[已有指标资产\]/);
assert.match(governanceRecommendationExport, /\[推荐指标候选\]/);
assert.match(governanceRecommendationExport, /\[认证资产候选\]/);
assert.match(governanceRecommendationExport, /\[风险\/冲突\]/);
assert.match(governanceRecommendationExport, /Agent text cannot rely on color rendering, HTML, font tags, or color names/);
assert.doesNotMatch(governanceRecommendationExport, /<font color=/);
assert.doesNotMatch(governanceRecommendationExport, /Red risk text/);

assert.match(skill, /`ok: true` with empty data is success/);
assert.match(skill, /Never relabel an empty report\/dashboard result as query failure/);
assert.match(skill, /`meta\.partial: true` is partial success/);
assert.match(skill, /`meta\.request_id`, `meta\.invocation_id`, `meta\.stage`/);
assert.match(skill, /Do not retry an unchanged failed command/);
assert.match(skill, /once per host.*user.*project.*conversation/i);
assert.match(skill, /project-scoped request to remember\/save a reusable analysis workflow/i);
assert.match(skill, /remember the above workflow[\s\S]*context_type=experience/);
assert.match(personalSemanticList, /asset_context.*resource_type.*resource_key.*display_name/is);
assert.match(personalSemanticList, /remember the above workflow[\s\S]*context_type=experience/);
assert.match(personalSemanticAdd, /remember the above workflow[\s\S]*context_type=experience/);
assert.match(skill, /ae-cli generates.*request_id.*before dispatch/i);
assert.match(skill, /Probe the first page exactly once/);
assert.match(skill, /continue only with the returned `next_offset` while `has_more` is true/);
assert.match(skill, /Never resubmit an identical invocation while it is still in flight/);
assert.match(skill, /Retry only the items named in `meta\.failures`/);
assert.match(skill, /successful or empty items/);
assert.doesNotMatch(skill, /module × model × outcome/);
assert.match(skill, /最近7天.*`mode=recent`.*`recentDay=0-7`.*含今天/);
assert.match(skill, /过去7天.*`mode=previous`.*`recentDay=1-7`.*不含今天/);
assert.match(skill, /`看板`.*`ae-cli analysis dashboard \.\.\.`.*`analysis\.dashboard\.\*`/);
assert.match(skill, /`仪表盘`.*`BI 仪表盘`.*`ae-cli analysis bi-panel \.\.\.`.*`analysis\.bi_panel\.\*`/);
assert.match(skill, /standalone English word `dashboard` is ambiguous/);
assert.match(skill, /Do not fall back to creating an analysis board/);
assert.match(skill, /Tag\/cluster candidate values.*`cluster_date_policy=LATEST`/i);
assert.match(skill, /latest computed data snapshot.*never.*definition or configuration release/i);
assert.match(skill, /`allowed_resource_types` is authoritative/);
assert.match(skill, /Confirm a selected business mapping once.*only one suitable candidate/);
assert.match(metadataResolution, /Reuse mappings already confirmed in this task/);
assert.match(metadataResolution, /allowed_resource_types/);
assert.match(metadataResolution, /search_targets.*constraints/);
assert.match(metadataResolution, /1–20 non-empty strings/);
assert.match(readFileSync(join(analysisRoot, 'references/catalog_export.md'), 'utf8'), /analysis-meta-catalog-project-<project_id>\.jsonl/);
assert.match(metadataResolution, /`complete: true`.*`output_path`/);
assert.match(metadataResolution, /failed request is an error, not an empty catalog/i);
assert.match(metadataResolution, /RESOLUTION_STALE.*RESOLUTION_TYPE_NOT_ALLOWED.*RESOLUTION_PATH_INVALID/i);
const resolutionFlag = metadataResolution.match(/--resolutions '([^']+)'/);
assert.ok(resolutionFlag, 'show the actual flag value rather than a gateway envelope');
const resolutionExample = JSON.parse(resolutionFlag[1]);
assert.equal(resolutionExample.resolutions, undefined);
assert.equal(resolutionExample['request.metrics[0].event'].resource_type, 'event');
const confirmedDefinitionFlag = metadataResolution.match(/--definition '([^']+)'/);
assert.ok(confirmedDefinitionFlag, 'pair a confirmed definition with its metadata binding');
const confirmedDefinition = JSON.parse(confirmedDefinitionFlag[1]);
assert.equal(confirmedDefinition.metrics[0].event, resolutionExample['request.metrics[0].event'].raw_value);
assert.equal(confirmedDefinition.metrics[0].aggregation, 'sum');
assert.ok(confirmedDefinition.metrics[0].property, 'confirmed sum must include its amount property');
const businessMetricBlock = aiModels.match(/## Unknown business metric[\s\S]*?```json\n([\s\S]*?)\n```/);
assert.ok(businessMetricBlock, 'show the resolved business-metric input');
const businessMetricExample = JSON.parse(businessMetricBlock[1]);
assert.equal(businessMetricExample.metrics.length, 1);
assert.deepEqual(Object.keys(businessMetricExample.metrics[0]), ['event', 'aggregation']);
assert.equal(typeof businessMetricExample.metrics[0].event, 'string');
assert.match(metadataResolution, /analysis-meta metric list[\s\S]*analysis asset search/);
assert.match(metadataResolution, /data\.metrics[\s\S]*data\.items/);
assert.match(metadataResolution, /analysis-meta property list[\s\S]*data\.properties/);
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
assert.match(dashboardUpdate, /operation=personal-default-filter.*current caller.*personal default/is);
assert.match(readFileSync(join(analysisRoot, 'references/analysis_gateway_assets.md'), 'utf8'), /Before querying a selected dashboard's report data.*dashboard get/is);
assert.match(skill, /folder_name.*dashboard_name.*notes/is);
assert.match(readFileSync(join(analysisRoot, 'references/analysis_gateway_assets.md'), 'utf8'), /effective_settings.*filter_config.*already applied.*AND/is);
assert.match(adhocRun, /--timeout-seconds` defaults to 120 and has a maximum of 180/);
assert.match(adhocRun, /path.*per path level.*`more`/i);
assert.match(adhocRun, /returned_rows.*real business nodes.*excludes synthesized.*more/is);
assert.match(aiModels, /path.*per path level.*returned_rows.*real business nodes.*excludes synthesized.*more/is);
assert.match(analysisToolsDoc, /analysis adhoc run[^\n]*Default timeout is 120 seconds/i);
assert.match(analysisToolsDoc, /analysis bi-panel-page-data run[^\n]*defaults to 120 seconds/i);

assert.match(reportCreate, /SQL dynamic parameter/);
assert.match(reportCreate, /"use_timezone":true/);
assert.match(reportCreate, /definition field.*`--sql-params`/i);
assert.match(reportCreate, /If the user also requests report data.*directly with the requested/is);
assert.match(reportCreate, /`report_id` returned by this exact create response/);
assert.match(reportCreate, /--resolutions.*not supported with `--model-type tag`/i);
assert.match(reportUpdate, /read the current `version` exactly once/);
assert.match(reportUpdate, /resolutions.*not supported with `model_type=tag`/i);
assert.match(reportUpdate, /If the user also requests report data.*query directly with the requested/is);
assert.match(reportCreate, /filter write boundary/);
assert.match(reportCreate, /`INVALID_CAPABILITY_INPUT`/);
assert.match(reportCreate, /deeper tree or empty group/);
assert.match(reportUpdate, /metadata-only changes/);
assert.match(reportUpdate, /never flatten/);
assert.match(reportList, /group known names into one `--queries` call or narrow with `--model-types`/);
assert.match(reportList, /do not issue one list call per name/);
assert.match(reportGet, /agent-facing `time_particle_size`/);
assert.match(reportGet, /internal `T0` through `T9` codes must never leak/);
assert.match(reportGet, /Do not infer a granularity/);
assert.match(reportGet, /persisted `cluster_date_policy`/);
assert.match(reportGet, /legacy report has no readable policy.*unknown/i);
assert.match(reportGet, /historical filter trees without flattening/);
assert.match(reportGet, /read\/write boundary/);
assert.match(aiModels, /reserved word/i);
assert.match(aiModels, /SELECT \"end\"/);
assert.match(aiModels, /real line break/i);
assert.match(aiModels, /literal `\\\\n`/);

assert.match(reportDataRun, /omit it when the saved defaults are requested/);
assert.match(reportDataRun, /pass the requested value overrides directly through `--sql-params`/);
assert.match(reportDataRun, /"recent_day":"1-7"/);
assert.match(reportDataRun, /exact UI label.*`options\[\]\.name`/i);
assert.match(reportDataRun, /Never put `options\[\]\.value` in the runtime override/);
assert.match(reportDataRun, /`selectorName invalid`/);
assert.match(reportDataRun, /`effective_zone_offset`/);
assert.match(reportDataRun, /resolved current-user timezone.*project default/);
assert.doesNotMatch(reportDataRun, /"recent_day":"past7"/);
assert.match(reportDataExport, /same export response/);
assert.match(reportDataExport, /exact UI option label.*`options\[\]\.name`/i);
assert.match(reportDataExport, /Never pass `options\[\]\.value`/);
assert.match(reportGet, /selector runtime override.*`data\.definition\.params\[\]\.options\[\]\.name`/i);
assert.match(aiModels, /definition-time rule is different from executing a saved report/i);

assert.match(analysisDataRetrieval, /ordinary query, omit `--use-cache`/i);
assert.match(analysisDataRetrieval, /permits cache reads but does not prove a cache hit/i);
assert.match(analysisDataRetrieval, /`--use-cache false`.*fresh data.*refresh or recomputation.*bypass\/disable cache.*freshly refreshed analysis UI/is);
assert.match(analysisDataRetrieval, /data freshness, not a time window/i);
assert.match(analysisDataRetrieval, /differs from the analysis UI.*exactly once.*`--use-cache false`/is);
assert.match(analysisDataRetrieval, /Claim a cache hit or miss only from explicit backend evidence/i);

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
assert.match(userTagModels, /Supported percentile values match the page controls: `5`[\s\S]*`99`/);
assert.match(userTagModels, /`percentile` field is required for percentile aggregation and is rejected for every other aggregation/);
assert.match(userTagModels, /Required: `event`, `aggregation`, and `time_range`/);
assert.match(userTagModels, /"aggregation":"median","property":"amount","time_range":\{"mode":"previous","unit":"day","value":30\}/);
assert.match(userTagModels, /"aggregation":"percentile","property":"amount","percentile":90,"time_range":\{"mode":"previous","unit":"day","value":30\}/);
assert.match(userTagCreate, /Every metric tag requires `metric\.time_range`/);
assert.match(userTagCreate, /Median metric tag for the previous 30 days[\s\S]*"aggregation":"median"[\s\S]*"time_range":\{"mode":"previous","unit":"day","value":30\}/);
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
assert.match(aiModels, /`AUTO` dynamically matches the computed result for each analysis date/);
assert.match(aiModels, /"cluster_date_policy": "AUTO"/);
assert.match(aiModels, /`field\.type=tag`.*alone does not prove it/);
assert.match(adhocRun, /effective `cluster_date_policy`/);
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
for (const name of ['heat_map', 'rank_list', 'revenue']) {
  const model = readFileSync(join(analysisRoot, `references/ai_models/${name}.md`), 'utf8');
  assert.match(model, /`percentile` is not supported/);
}
assert.doesNotMatch(aiModels, /Distribution count-like metrics:.*`total_count`/);
assert.doesNotMatch(aiModels, /"target_aggregation": "user_count"/);
assert.match(aiModels, /Do not use top-level `filters` or `relation` in a distribution definition/);
assert.match(commandIndex, /global filters support user_property, cluster, and tag only/);
assert.match(commandIndex, /express one day as session_interval=24 and session_unit=hour/);
assert.match(commandIndex, /Search-only fallback/);
assert.match(commandIndex, /Never load or print this exhaustive file in full/);
assert.match(adhocRun, /validate that exact definition once.*run the same definition once/is);
assert.match(adhocRun, /Preserve all requested filters and groups through corrections/);
assert.match(adhocRun, /inspect this command's model contract or capability schema once/i);
assert.match(aiModels, /Omit `display_name` by default/);
assert.match(aiModels, /target host.*schema.*explicitly supports `display_name`/i);
const eventExamples = readFileSync(join(analysisRoot, 'references/ai_models/event.md'), 'utf8');
assert.match(aiCommon, /A compound node has `relation` plus `items`/);
assert.match(aiCommon, /Do not rename it to `filters`/);
assert.match(aiCommon, /at most one compound group level, with leaf-only, non-empty `items`/);
assert.match(aiCommon, /capability schema rejects deeper or empty groups as `INVALID_CAPABILITY_INPUT`/);
assert.match(aiCommon, /Omit `definition` for an unrelated metadata update/);
assert.match(eventExamples, /Preserve this tree on read/);
assert.match(eventExamples, /shared saved-report boundary/);
assert.match(eventExamples, /never flatten a deeper historical tree/);
for (const match of eventExamples.matchAll(/```json\n([\s\S]*?)\n```/g)) {
  const definition = JSON.parse(match[1]);
  assert.ok(definition.metrics.every((metric: Record<string, unknown>) => !('display_name' in metric)));
}
const funnelExampleMatch = aiModels.match(/Step-level event-property filters[\s\S]*?```json\n([\s\S]*?)\n```/);
assert.ok(funnelExampleMatch, 'funnel must include a complete step-level filter example');
const funnelExample = JSON.parse(funnelExampleMatch[1]);
assert.deepEqual(funnelExample.funnel.steps.map((step: any) => step.event), ['register', 'login', 'payment']);
assert.deepEqual(funnelExample.funnel.steps[2].filters, [{ event_property_name: 'is_first_pay', operator: 'eq', values: ['true'] }]);
assert.deepEqual(funnelExample.funnel.window, { value: 7, unit: 'day' });
assert.match(skill, /process exit code.*business success/i);
assert.match(skill, /TE_TOOL_POLICY_DENIED.*authorization stage/i);
assert.match(skill, /QUERY_FAILED.*does not establish.*root cause/i);
assert.match(skill, /validation passed.*explicit successful validation response/i);
assert.match(adhocRun, /oneOf.*selected `model_type`/i);
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
