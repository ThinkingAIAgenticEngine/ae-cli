import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { getClusterInfoFilePath } from '../src/core/cluster-info.ts';

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
    if (entry.name === 'index.ts' || entry.name === 'shared.ts') continue;
    if (!isGlobalQueryModeEnabled() && p.includes(`${path.sep}global${path.sep}`)) continue;
    commandFiles.push(p);
  }
}

walk(commandsDir);

const coreCommands = [];
const fileContents = new Map();
for (const file of commandFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  fileContents.set(file, content);
  const match = content.match(/command:\s*'\+([a-z0-9_]+)'/);
  if (!match) {
    fail(`cannot parse command from ${path.relative(ROOT, file)}`);
  }
  coreCommands.push(match[1]);
}

const coreSet = new Set(coreCommands);
if (coreSet.size !== coreCommands.length) {
  fail('duplicate core command names found in source files');
}

const EXPECTED_CORE_COUNT = isGlobalQueryModeEnabled() ? 41 : 40;
if (coreCommands.length !== EXPECTED_CORE_COUNT) {
  fail(`analysis tool count mismatch: expected ${EXPECTED_CORE_COUNT}, got ${coreCommands.length}`);
}

const help = spawnSync('npx', ['tsx', 'src/index.ts', 'analysis', '--help'], {
  cwd: ROOT,
  encoding: 'utf-8',
  maxBuffer: 10 * 1024 * 1024,
});

if (help.status !== 0) {
  process.stderr.write(help.stderr || '');
  fail('failed to run analysis --help');
}

for (const tool of coreCommands) {
  const token = `+${tool}`;
  const toolHelp = spawnSync('npx', ['tsx', 'src/index.ts', 'analysis', token, '--help'], {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (toolHelp.status !== 0) {
    process.stderr.write(toolHelp.stderr || '');
    fail(`failed to run analysis ${token} --help`);
  }
  if (!toolHelp.stdout.includes(`Usage: ae-cli analysis ${token}`)) {
    fail(`command help output missing usage for: ${token}`);
  }
}

const cancellableQueryTokens = ["name: 'request_id'", "requestId: optionalString(ctx, 'request_id')"];
const lifecycleDescriptionTokens = [
  'provide requestId before starting',
  'metadata.requestId',
  'cancel_query',
  'provide this before starting',
  'caller stops waiting',
  'fetch failed',
  'HTTP timeout',
  'backend query may still be running',
  'auto-generated requestId is not available',
  '+cancel_query --request_id',
  'mcp_<32 lowercase hex UUID>',
  'mcp_0123456789abcdef0123456789abcdef',
];
const requiredTokensByFile = {
  'src/commands/te-analysis/dashboard/query-bi-panel-data.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens],
  'src/commands/te-analysis/dashboard/query-dashboard-report-data.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens, "name: 'timeout_minutes'", "timeoutMinutes: optionalNumber(ctx, 'timeout_minutes')"],
  'src/commands/te-analysis/entity/query-entity-details.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens, "name: 'timeout_minutes'", "timeoutMinutes: optionalNumber(ctx, 'timeout_minutes')"],
  'src/commands/te-analysis/entity/query-event-details.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens, "name: 'timeout_minutes'", "timeoutMinutes: optionalNumber(ctx, 'timeout_minutes')"],
  'src/commands/te-analysis/model/drilldown-user-events.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens],
  'src/commands/te-analysis/model/drilldown-users.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens],
  'src/commands/te-analysis/model/query-adhoc.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens],
  'src/commands/te-analysis/report/query-report-data.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens],
  'src/commands/te-analysis/model/cancel-query.ts': [
    'caller or agent timed out before the query returned',
    'fetch failed',
    'HTTP timeout',
    'backend query may still be running',
    'auto-generated requestId is not available',
    '+cancel_query --request_id',
    'proactive cancellation',
    'metadata.requestId',
    'supplied before starting',
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

const lifecycleReferenceTokens = [
  'provide this before starting',
  'caller stops waiting',
  'fetch failed',
  'HTTP timeout',
  'backend query may still be running',
  'auto-generated requestId is not available',
  '+cancel_query --request_id',
  'metadata.requestId',
  'cancel_query',
  'mcp_<32 lowercase hex UUID>',
  'mcp_0123456789abcdef0123456789abcdef',
];
const requiredReferenceTokensByFile = {
  'skills/ae-analysis/references/query_bi_panel_data.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/query_dashboard_report_data.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/query_report_data.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/query_entity_details.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/query_event_details.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/query_adhoc.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/drilldown_users.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/drilldown_user_events.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/cancel_query.md': [
    'caller or agent timed out before the query returned',
    'fetch failed',
    'HTTP timeout',
    'backend query may still be running',
    'auto-generated requestId is not available',
    '+cancel_query --request_id',
    'proactive cancellation',
    'metadata.requestId',
    'supplied before starting',
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

const docsPath = path.join(ROOT, 'docs/te-analysis/te-analysis-mcp-tools.md');
if (!fs.existsSync(docsPath)) {
  fail('missing docs/te-analysis/te-analysis-mcp-tools.md');
}
const docsContent = fs.readFileSync(docsPath, 'utf-8');
const lifecycleDocsTokens = [
  'fetch failed',
  'HTTP timeout',
  'backend query may still be running',
  'auto-generated requestId is not available',
  '+cancel_query --request_id',
  'metadata.requestId',
  'mcp_<32 lowercase hex UUID>',
  'mcp_0123456789abcdef0123456789abcdef',
];
const lifecycleDocsSections = [
  '#### query_report_data',
  '#### query_dashboard_report_data',
  '#### query_bi_panel_data',
  '#### query_adhoc',
  '#### drilldown_users',
  '#### drilldown_user_events',
  '#### query_entity_details',
  '#### query_event_details',
];
for (const section of lifecycleDocsSections) {
  const start = docsContent.indexOf(section);
  if (start < 0) {
    fail(`missing analysis docs section: ${section}`);
  }
  const nextSection = docsContent.indexOf('\n#### ', start + section.length);
  const body = docsContent.slice(start, nextSection < 0 ? undefined : nextSection);
  for (const token of lifecycleDocsTokens) {
    if (!body.includes(token)) {
      fail(`missing required analysis docs contract "${token}" in ${section}`);
    }
  }
}
const cancelStart = docsContent.indexOf('#### cancel_query');
if (cancelStart < 0) {
  fail('missing analysis docs section: #### cancel_query');
}
const cancelNext = docsContent.indexOf('\n#### ', cancelStart + '#### cancel_query'.length);
const cancelBody = docsContent.slice(cancelStart, cancelNext < 0 ? undefined : cancelNext);
for (const token of lifecycleDocsTokens) {
  if (!cancelBody.includes(token)) {
    fail(`missing required analysis docs contract "${token}" in #### cancel_query`);
  }
}

console.log(`OK: verified ${coreCommands.length} analysis tools are registered and aligned.`);
