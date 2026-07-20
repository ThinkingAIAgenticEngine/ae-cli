import fs from 'fs';
import path from 'path';
import { Command as CommanderCommand } from 'commander';
import { getClusterInfoFilePath } from '../src/core/cluster-info.ts';
import { registerCommands } from '../src/framework/register.ts';

const ROOT = process.cwd();
const commandsDir = path.join(ROOT, 'src/commands/te-analysis');
const clusterInfoFile = getClusterInfoFilePath();

function isGlobalQueryModeEnabled() {
  try {
    const raw = JSON.parse(fs.readFileSync(clusterInfoFile, 'utf-8'));
    return raw?.sw_cfg_enable_global_query === true;
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const commandFiles = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    if (!isGlobalQueryModeEnabled() && p.includes(`${path.sep}global${path.sep}`)) continue;
    commandFiles.push(p);
  }
}

walk(commandsDir);

const coreCommands = [];
const capabilityCommands = [];
const gatewayLifecycleCommands = [];
const fileContents = new Map();
for (const file of commandFiles) {
  fileContents.set(file, fs.readFileSync(file, 'utf-8'));
}

const { default: registeredCommands } = await import('../src/commands/te-analysis/index.ts');
for (const command of registeredCommands) {
  if (command.command.startsWith('+')) {
    coreCommands.push(command.command.slice(1));
    continue;
  }
  if (!command.resource) {
    fail(`registered analysis command has no resource: ${command.command}`);
  }
  if (!command.capabilityId) {
    gatewayLifecycleCommands.push({
      service: command.service,
      resource: command.resource,
      command: command.command,
    });
    continue;
  }
  capabilityCommands.push({
    service: command.service,
    resource: command.resource,
    command: command.command,
    capabilityId: command.capabilityId,
  });
}

const coreSet = new Set(coreCommands);
if (coreSet.size !== coreCommands.length) {
  fail('duplicate core command names found in source files');
}

const capabilitySet = new Set(capabilityCommands.map((item) => `${item.service} ${item.resource} ${item.command}`));
if (capabilitySet.size !== capabilityCommands.length) {
  fail('duplicate capability command names found in source files');
}
const capabilityIdSet = new Set(capabilityCommands.map((item) => item.capabilityId));
if (capabilityIdSet.size !== capabilityCommands.length) {
  fail('duplicate analysis capability IDs found in registered command metadata');
}
const gatewayLifecycleSet = new Set(gatewayLifecycleCommands.map((item) => `${item.resource} ${item.command}`));
if (gatewayLifecycleSet.size !== gatewayLifecycleCommands.length) {
  fail('duplicate gateway lifecycle command names found in source files');
}

const EXPECTED_CORE_COUNT = isGlobalQueryModeEnabled() ? 9 : 8;
if (coreCommands.length !== EXPECTED_CORE_COUNT) {
  fail(`analysis tool count mismatch: expected ${EXPECTED_CORE_COUNT}, got ${coreCommands.length}`);
}
const REQUIRED_FOUR_MODULE_CAPABILITIES = [
  'analysis.dashboard.list',
  'analysis.dashboard.get',
  'analysis.dashboard_report_data.run',
  'analysis.dashboard_report_data.export',
  'analysis.report.list',
  'analysis.report.get',
  'analysis.report.create',
  'analysis.report.update',
  'analysis.report_data.run',
  'analysis.report_data.export',
  'analysis.adhoc.run',
  'analysis.adhoc.export',
  'analysis.query.drilldown_events',
  'analysis.query.drilldown_events_export',
  'analysis.query.drilldown_entities',
  'analysis.query.drilldown_entities_export',
  'analysis.query.drilldown_user_events',
  'analysis.query.drilldown_user_events_export',
  'analysis.query.create_result_cluster',
  'analysis.user_cluster.list',
  'analysis.user_cluster.create',
  'analysis.user_cluster.update',
  'analysis.user_cluster_member.list',
  'analysis.user_cluster_member.export',
  'analysis.user_tag.list',
  'analysis.user_tag.create',
  'analysis.user_tag.update',
  'analysis.user_tag_member.list',
  'analysis.user_tag_member.export',
  'analysis.history_tag.batch_refresh',
];
for (const capabilityId of REQUIRED_FOUR_MODULE_CAPABILITIES) {
  if (!capabilityIdSet.has(capabilityId)) {
    fail(`missing required dashboard/report/adhoc/audience capability: ${capabilityId}`);
  }
}
if (capabilityIdSet.has('analysis.user_cluster.create_from_result')) {
  fail('duplicate result-cluster capability must not be reintroduced; use analysis.query.create_result_cluster');
}
const EXPECTED_GATEWAY_LIFECYCLE_COUNT = 4;
if (gatewayLifecycleCommands.length !== EXPECTED_GATEWAY_LIFECYCLE_COUNT) {
  fail(`analysis gateway lifecycle command count mismatch: expected ${EXPECTED_GATEWAY_LIFECYCLE_COUNT}, got ${gatewayLifecycleCommands.length}`);
}

const EXPECTED_CAPABILITY_COUNT = 207;
if (capabilityCommands.length !== EXPECTED_CAPABILITY_COUNT) {
  fail(`analysis capability command count mismatch: expected ${EXPECTED_CAPABILITY_COUNT}, got ${capabilityCommands.length}`);
}

const EXPECTED_CAPABILITY_COUNTS_BY_SERVICE = {
  analysis: 139,
  'analysis-meta': 48,
  'analysis-governance': 20,
};
for (const [service, expectedCount] of Object.entries(EXPECTED_CAPABILITY_COUNTS_BY_SERVICE)) {
  const actualCount = capabilityCommands.filter((item) => item.service === service).length;
  if (actualCount !== expectedCount) {
    fail(`${service} capability command count mismatch: expected ${expectedCount}, got ${actualCount}`);
  }
}

const program = new CommanderCommand().name('ae-cli');
registerCommands(program, registeredCommands);
const analysisHelp = program.commands.find((item) => item.name() === 'analysis');
if (!analysisHelp) {
  fail('registered command tree is missing the analysis service');
}

for (const tool of coreCommands) {
  const token = `+${tool}`;
  const command = analysisHelp.commands.find((item) => item.name() === token);
  if (!command || !command.helpInformation().includes(`Usage: ae-cli analysis ${token}`)) {
    fail(`command help output missing usage for: ${token}`);
  }
}

for (const item of [...capabilityCommands, ...gatewayLifecycleCommands]) {
  const service = program.commands.find((command) => command.name() === item.service);
  let resource = service;
  for (const segment of item.resource.split(/\s+/).filter(Boolean)) {
    resource = resource?.commands.find((command) => command.name() === segment);
  }
  const command = resource?.commands.find((candidate) => candidate.name() === item.command);
  if (!command || !command.helpInformation().includes(`Usage: ae-cli ${item.service} ${item.resource} ${item.command}`)) {
    fail(`command help output missing usage for: ${item.service} ${item.resource} ${item.command}`);
  }
}

const requiredTokensByFile = {
  'src/commands/te-analysis/model/cancel-query.ts': [
    'caller or agent timed out before the query returned',
    'fetch failed',
    'HTTP timeout',
    'backend query may still be running',
    '+cancel_query --request_id',
    'proactive cancellation',
    'metadata.requestId',
    'supplied before starting',
    'generate and pass requestId',
    'mcp_<32 lowercase hex UUID>',
    'mcp_0123456789abcdef0123456789abcdef',
  ],
};

for (const [relPath, tokens] of Object.entries(requiredTokensByFile)) {
  const absPath = path.join(ROOT, relPath);
  const content = fileContents.get(absPath);
  if (!content) {
    fail(`missing required command file: ${relPath}`);
  }
  for (const token of tokens) {
    if (!content.includes(token)) {
      fail(`missing required analysis arg contract "${token}" in ${relPath}`);
    }
  }
}

const requiredReferenceTokensByFile = {
  'skills/ae-analysis/references/cancel_query.md': [
    'caller or agent timed out before the query returned',
    'fetch failed',
    'HTTP timeout',
    'backend query may still be running',
    '+cancel_query --request_id',
    'proactive cancellation',
    'metadata.requestId',
    'supplied before starting',
    'MCP query tools require caller-supplied',
    'mcp_<32 lowercase hex UUID>',
    'mcp_0123456789abcdef0123456789abcdef',
  ],
};

for (const [relPath, tokens] of Object.entries(requiredReferenceTokensByFile)) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    fail(`missing required reference file: ${relPath}`);
  }
  const content = fs.readFileSync(absPath, 'utf-8');
  for (const token of tokens) {
    if (!content.includes(token)) {
      fail(`missing required analysis reference contract "${token}" in ${relPath}`);
    }
  }
}

function capabilityReferenceName(resource, command) {
  return `${resource.replaceAll('-', '_').replaceAll(/\s+/g, '_')}_${command.replaceAll('-', '_')}.md`;
}

for (const item of [...capabilityCommands, ...gatewayLifecycleCommands]) {
  const relPath = `skills/ae-analysis/references/${capabilityReferenceName(item.resource, item.command)}`;
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    fail(`missing capability reference file: ${relPath}`);
  }
  const content = fs.readFileSync(absPath, 'utf-8');
  const requiredTokens = [
    `# ${item.service} ${item.resource} ${item.command}`,
    `ae-cli ${item.service} ${item.resource} ${item.command}`,
    ...(item.service === 'analysis-meta' ? ['Use', 'Do not use', 'Input', 'Output'] : []),
  ];
  for (const token of requiredTokens) {
    if (!content.includes(token)) {
      fail(`missing capability reference token "${token}" in ${relPath}`);
    }
  }
}

const criticalReferenceTokens = {
  'skills/ae-analysis/references/dashboard_list.md': ['dashboard_id', 'dashboard_name', 'remark', 'snake_case'],
  'skills/ae-analysis/references/dashboard_share.md': ['numeric user ID', 'READ', 'EDIT', 'complete directly shared user map'],
  'skills/ae-analysis/references/dashboard_update.md': ['refresh_type', '0', '1', 'dashboard_status', 'normal', 'freeze', 'dashboard_job_schedule'],
  'skills/ae-analysis/references/audience_models.md': ['Operators', 'Property reference', 'Time range', 'Filter group'],
  'skills/ae-analysis/references/user_cluster_models.md': ['event', 'user', 'tag', 'cluster', 'compound', 'behavior_sequence', 'condition', 'SQL'],
  'skills/ae-analysis/references/user_tag_models.md': ['condition', 'metric', 'first_last', 'SQL'],
  'skills/ae-analysis/references/user_cluster_member_export.md': ['has_more=false', 'final metadata line'],
  'skills/ae-analysis/references/user_tag_member_export.md': ['has_more=false', 'final metadata line'],
  'skills/ae-analysis/references/history_tag_batch_refresh.md': ['start_time', 'end_time', 'only_abnormal', 'use_user_table_type'],
  'skills/ae-analysis/references/analysis_drilldown_contract.md': ['synchronous_preview_only', 'row_options[]', 'metric_options[]', 'ENTITY_LIST', '`attribution_event_id`'],
  'skills/ae-analysis/references/drilldown_events_run.md': ['analysis_angle=EVENT_LIST', '`target_id`'],
  'skills/ae-analysis/references/drilldown_events_export.md': ['does not accept `--limit`', 'one full-download query', '`csv.gz`'],
  'skills/ae-analysis/references/drilldown_entities_run.md': ['subject.type=user', 'subject.type=entity', 'shallow-merge'],
  'skills/ae-analysis/references/drilldown_entities_export.md': ['does not accept `--limit`', 'never creates a query context'],
  'skills/ae-analysis/references/drilldown_user_events_export.md': ['does not accept `--limit`, `--offset`, `--page-num`, or `--page-size`', 'without the synchronous 1000-row preview cap', '`csv.gz`'],
  'skills/ae-analysis/references/query_create_result_cluster.md': ['custom-entity', 'query_context_id', 'coordinate'],
  'skills/ae-analysis/references/analysis_data_retrieval.md': ['Default and maximum runtime is 21600 seconds (6 hours)', 'sources', 'synchronous'],
  'skills/ae-analysis/references/report_create.md': ['SQL dynamic parameter', 'query the saved default first', '`report_id` returned by this exact create response'],
  'skills/ae-analysis/references/report_update.md': ['read the current `version` exactly once', 'query the saved default before applying an override'],
  'skills/ae-analysis/references/report_list.md': ['narrow with `--query` or `--model-types` before paging', 'do not enumerate every report page'],
  'skills/ae-analysis/references/report_data_run.md': ['omit `--sql-params` to execute the saved default', 'then make one second call with `--sql-params`', '"recent_day":"1-7"'],
  'skills/ae-analysis/references/report_data_export.md': ['same export response'],
  'skills/ae-analysis/references/adhoc_run.md': ['SQL text requests `LIMIT 2000`', 'go directly to `analysis adhoc export`', 'Do not lower the SQL limit to 1000'],
  'skills/ae-analysis/references/adhoc_export.md': ['Preserve the `run_id` and `artifact_id` from this exact submit response'],
  'skills/ae-analysis/references/run_inspect.md': ['same export response'],
  'skills/ae-analysis/references/artifact_download.md': ['same export response'],
  'skills/ae-analysis/references/asset_url_get.md': ['post-write resource link completion', 'raw_url', 'markdown_link'],
  'skills/ae-analysis/references/report_get.md': ['agent-facing `time_particle_size`', 'internal `T0` through `T9` codes must never leak', 'Do not infer a granularity'],
  'skills/ae-analysis/references/ai_models.md': [
    '`tag_name` is the only tag-report name field',
    '`second`: `1..999`',
    '`minute`: `1..999`',
    '`hour`: `1..24`',
    'never relabel it as `user_property`',
  ],
};
for (const [relPath, tokens] of Object.entries(criticalReferenceTokens)) {
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  for (const token of tokens) {
    if (!content.includes(token)) {
      fail(`missing critical four-module contract "${token}" in ${relPath}`);
    }
  }
}

const forbiddenReferenceTokens = {
  'skills/ae-analysis/SKILL.md': ['+list_reports', 'analysis user capability gateway (32)'],
  'skills/ae-analysis/references/dashboard_list.md': ['dashboardId","dashboardName'],
  'skills/ae-analysis/references/user_cluster_create.md': ['Optional: `--type condition|sql`, `--authenticated-only`, `--remark`'],
  'skills/ae-analysis/references/user_tag_create.md': ['Optional: `--type condition|metric|first_last|sql`, `--authenticated-only`, `--remark`'],
  'skills/ae-analysis/references/user_cluster_member_export.md': ['capped at 10000'],
  'skills/ae-analysis/references/user_tag_member_export.md': ['capped at 10000'],
  'skills/ae-analysis/references/adhoc_run.md': ['[--offset'],
  'skills/ae-analysis/references/user_cluster_member_list.md': ['Optional: `--property-names`, `--fields`, `--query`, `--use-cache`, `--request-id`, `--limit`, `--offset`'],
  'skills/ae-analysis/references/user_tag_member_list.md': ['Optional: `--snapshot-date`, `--property-names`, `--fields`, `--query`, `--use-cache`, `--request-id`, `--limit`, `--offset`'],
  'skills/ae-analysis/references/history_tag_data_drilldown_run.md': ['`--limit`, `--offset`'],
};
for (const [relPath, tokens] of Object.entries(forbiddenReferenceTokens)) {
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  for (const token of tokens) {
    if (content.includes(token)) {
      fail(`forbidden stale contract "${token}" in ${relPath}`);
    }
  }
}

const docsPath = path.join(ROOT, 'docs/te-analysis/te-analysis-mcp-tools.md');
if (!fs.existsSync(docsPath)) {
  fail('missing docs/te-analysis/te-analysis-mcp-tools.md');
}
const docsContent = fs.readFileSync(docsPath, 'utf-8');
const removedDocsTokens = [
  'query_adhoc',
  'build_event_analysis_qp',
  'build_retention_analysis_qp',
  'build_funnel_analysis_qp',
  'build_distribution_analysis_qp',
  'build_attribution_analysis_qp',
  'build_interval_analysis_qp',
  'build_path_analysis_qp',
  'build_prop_analysis_qp',
  'build_heat_map_analysis_qp',
  'build_rank_list_analysis_qp',
  'get_analysis_query_schema',
  'get_filter_schema',
  'get_groupby_schema',
];
for (const token of removedDocsTokens) {
  if (docsContent.includes(token)) {
    fail(`removed ad-hoc QP/schema docs token must not appear in ${path.relative(ROOT, docsPath)}: ${token}`);
  }
}
const currentDocsTokens = [
  'analysis adhoc run',
  'analysis adhoc export',
  'analysis report create',
  'analysis report update',
  'analysis report-data run',
  'analysis report-data export',
  'analysis dashboard-report-data run',
  'analysis dashboard-report-data export',
  'analysis bi-panel-page-data run',
  'analysis bi-panel-page-data export',
  'analysis drilldown-events run',
  'analysis drilldown-events export',
  'analysis drilldown-entities run',
  'analysis drilldown-entities export',
  'analysis drilldown-user-events run',
  'analysis drilldown-user-events export',
  'analysis query create-result-cluster',
  'analysis query cancel',
  'analysis run inspect',
  'analysis artifact download',
  'model_type + definition',
  'query_context_id',
  'drilldown_context_id',
  'Default limit is 100, max 1000',
  'Default and maximum runtime is 21600 seconds (6 hours)',
  'mcp_<32 lowercase hex UUID>',
  'mcp_0123456789abcdef0123456789abcdef',
  'REQUEST_ID_REQUIRED',
  'INVALID_REQUEST_ID',
  '+cancel_query --request_id',
  'metadata.requestId',
  'fetch failed',
  'HTTP timeout',
  'backend query may still be running',
];
for (const token of currentDocsTokens) {
  if (!docsContent.includes(token)) {
    fail(`missing current analysis docs contract "${token}" in ${path.relative(ROOT, docsPath)}`);
  }
}

console.log(`OK: verified ${coreCommands.length} MCP analysis tools, ${capabilityCommands.length} capability commands, and ${gatewayLifecycleCommands.length} gateway lifecycle commands are registered and aligned.`);
