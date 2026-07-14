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
    if (entry.name === 'index.ts' || entry.name === 'shared.ts' || entry.name === 'capability-shared.ts') continue;
    if (!isGlobalQueryModeEnabled() && p.includes(`${path.sep}global${path.sep}`)) continue;
    commandFiles.push(p);
  }
}

walk(commandsDir);

const coreCommands = [];
const capabilityCommands = [];
const fileContents = new Map();
for (const file of commandFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  fileContents.set(file, content);
  const mcpMatch = content.match(/command:\s*'\+([a-z0-9_]+)'/);
  if (mcpMatch) {
    coreCommands.push(mcpMatch[1]);
    continue;
  }
  const resourceMatch = content.match(/resource:\s*'([^']+)'/);
  const commandMatch = content.match(/command:\s*'([^']+)'/);
  const capabilityMatch = content.match(/capabilityId:\s*'([^']+)'/);
  const directGatewayEndpoint = content.includes('callCapabilityApi(') || content.includes('downloadCapabilityArtifact(');
  if (!resourceMatch || !commandMatch || (!capabilityMatch && !directGatewayEndpoint)) {
    fail(`cannot parse command from ${path.relative(ROOT, file)}`);
  }
  capabilityCommands.push({
    file,
    service: content.includes('createAnalysisMetaCapabilityCommand') ? 'analysis-meta' : 'analysis',
    resource: resourceMatch[1],
    command: commandMatch[1],
    capabilityId: capabilityMatch ? capabilityMatch[1] : '(gateway endpoint)',
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

const EXPECTED_CORE_COUNT = isGlobalQueryModeEnabled() ? 37 : 36;
if (coreCommands.length !== EXPECTED_CORE_COUNT) {
  fail(`analysis tool count mismatch: expected ${EXPECTED_CORE_COUNT}, got ${coreCommands.length}`);
}

const EXPECTED_CAPABILITY_COUNT = 96;
if (capabilityCommands.length !== EXPECTED_CAPABILITY_COUNT) {
  fail(`analysis capability command count mismatch: expected ${EXPECTED_CAPABILITY_COUNT}, got ${capabilityCommands.length}`);
}

const expectedCapabilityCountsByService = {
  analysis: 49,
  'analysis-meta': 47,
};
for (const [service, expectedCount] of Object.entries(expectedCapabilityCountsByService)) {
  const actualCount = capabilityCommands.filter((item) => item.service === service).length;
  if (actualCount !== expectedCount) {
    fail(`${service} capability command count mismatch: expected ${expectedCount}, got ${actualCount}`);
  }
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

for (const item of capabilityCommands) {
  const toolHelp = spawnSync('npx', ['tsx', 'src/index.ts', item.service, item.resource, item.command, '--help'], {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (toolHelp.status !== 0) {
    process.stderr.write(toolHelp.stderr || '');
    fail(`failed to run ${item.service} ${item.resource} ${item.command} --help`);
  }
  if (!toolHelp.stdout.includes(`Usage: ae-cli ${item.service} ${item.resource} ${item.command}`)) {
    fail(`command help output missing usage for: ${item.service} ${item.resource} ${item.command}`);
  }
}

const cancellableQueryTokens = [
  "name: 'request_id', type: 'string', required: true",
  "requestId: ctx.str('request_id')",
];
const lifecycleDescriptionTokens = [
  'requestId is required and must be provided before starting',
  'metadata.requestId',
  'cancel_query',
  'Generate it before starting',
  'caller stops waiting',
  'fetch failed',
  'HTTP timeout',
  'backend query may still be running',
  'is not auto-generated for MCP query tools',
  'REQUEST_ID_REQUIRED',
  'INVALID_REQUEST_ID',
  '+cancel_query --request_id',
  'mcp_<32 lowercase hex UUID>',
  'mcp_0123456789abcdef0123456789abcdef',
];
const requiredTokensByFile = {
  'src/commands/te-analysis/entity/query-entity-details.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens, "name: 'timeout_minutes'", "timeoutMinutes: optionalNumber(ctx, 'timeout_minutes')"],
  'src/commands/te-analysis/entity/query-event-details.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens, "name: 'timeout_minutes'", "timeoutMinutes: optionalNumber(ctx, 'timeout_minutes')"],
  'src/commands/te-analysis/model/drilldown-user-events.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens, "name: 'limit'", "name: 'offset'", "limit: optionalNumber(ctx, 'limit')", "offset: optionalNumber(ctx, 'offset')"],
  'src/commands/te-analysis/model/drilldown-users.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens],
  'src/commands/te-analysis/model/query-adhoc.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens],
  'src/commands/te-analysis/report/query-report-data.ts': [...cancellableQueryTokens, ...lifecycleDescriptionTokens],
  'src/commands/te-analysis/report/update-report.ts': ["name: 'report_version'", "version: ctx.num('report_version')"],
  'src/commands/te-analysis/schema/get-analysis-query-schema.ts': ['all ten non-SQL models', 'SQL manual path'],
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

const lifecycleReferenceTokens = [
  'Generate it before starting',
  'caller stops waiting',
  'fetch failed',
  'HTTP timeout',
  'backend query may still be running',
  'is not auto-generated for MCP query tools',
  'REQUEST_ID_REQUIRED',
  'INVALID_REQUEST_ID',
  '+cancel_query --request_id',
  'metadata.requestId',
  'cancel_query',
  'mcp_<32 lowercase hex UUID>',
  'mcp_0123456789abcdef0123456789abcdef',
];
const requiredReferenceTokensByFile = {
  'skills/ae-analysis/references/query_report_data.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/query_entity_details.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/query_event_details.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/query_adhoc.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/drilldown_users.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/drilldown_user_events.md': [...lifecycleReferenceTokens, '--limit', '--offset'],
  'skills/ae-analysis/references/update_report.md': ['--report_version'],
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
  return `${resource.replaceAll('-', '_')}_${command.replaceAll('-', '_')}.md`;
}

for (const item of capabilityCommands) {
  const relPath = `skills/ae-analysis/references/${capabilityReferenceName(item.resource, item.command)}`;
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    fail(`missing capability reference file: ${relPath}`);
  }
  const content = fs.readFileSync(absPath, 'utf-8');
  const requiredTokens = [
    `# ${item.service} ${item.resource} ${item.command}`,
    `ae-cli ${item.service} ${item.resource} ${item.command}`,
    'Use',
    'Do not use',
    'Input',
    'Output',
  ];
  for (const token of requiredTokens) {
    if (!content.includes(token)) {
      fail(`missing capability reference token "${token}" in ${relPath}`);
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
  'requestId 不会自动生成',
  'REQUEST_ID_REQUIRED',
  'INVALID_REQUEST_ID',
  '+cancel_query --request_id',
  'metadata.requestId',
  'mcp_<32 lowercase hex UUID>',
  'mcp_0123456789abcdef0123456789abcdef',
];
const cancelDocsTokens = [
  'fetch failed',
  'HTTP timeout',
  'backend query may still be running',
  '必须在查询开始前生成并传入',
  '+cancel_query --request_id',
  'metadata.requestId',
  'mcp_<32 lowercase hex UUID>',
  'mcp_0123456789abcdef0123456789abcdef',
];
const lifecycleDocsSections = [
  '#### query_report_data',
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
for (const token of cancelDocsTokens) {
  if (!cancelBody.includes(token)) {
    fail(`missing required analysis docs contract "${token}" in #### cancel_query`);
  }
}

console.log(`OK: verified ${coreCommands.length} MCP analysis tools and ${capabilityCommands.length} capability commands are registered and aligned.`);
