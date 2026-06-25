import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const commandsDir = path.join(ROOT, 'src/commands/te-audience');

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
    commandFiles.push(p);
  }
}

walk(commandsDir);

const commands = [];
const fileContents = new Map();
for (const file of commandFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  fileContents.set(file, content);
  const match = content.match(/command:\s*'\+([a-z0-9_]+)'/);
  if (!match) {
    fail(`cannot parse command from ${path.relative(ROOT, file)}`);
  }
  commands.push(match[1]);
}

const commandSet = new Set(commands);
if (commandSet.size !== commands.length) {
  fail('duplicate analysis_audience command names found in source files');
}

const EXPECTED_COUNT = 14;
if (commands.length !== EXPECTED_COUNT) {
  fail(`analysis_audience tool count mismatch: expected ${EXPECTED_COUNT}, got ${commands.length}`);
}

const help = spawnSync('npx', ['tsx', 'src/index.ts', 'analysis_audience', '--help'], {
  cwd: ROOT,
  encoding: 'utf-8',
});

if (help.status !== 0) {
  process.stderr.write(help.stderr || '');
  fail('failed to run analysis_audience --help');
}

for (const tool of commands) {
  const token = `+${tool}`;
  if (!help.stdout.includes(token)) {
    fail(`help output missing command: ${token}`);
  }
}

// Guard critical argument contracts for cluster/tag MCP tools.
const lifecycleDescriptionTokens = [
  "name: 'request_id'",
  "requestId: optionalString(ctx, 'request_id')",
  "name: 'timeout_minutes'",
  "timeoutMinutes: optionalNumber(ctx, 'timeout_minutes')",
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
  'src/commands/te-audience/cluster/list-clusters.ts': ["name: 'query'", "name: 'fields'", "name: 'limit'", "name: 'offset'"],
  'src/commands/te-audience/cluster/list-cluster-members.ts': ["name: 'query'", "name: 'fields'", "name: 'limit'", "name: 'offset'", ...lifecycleDescriptionTokens],
  'src/commands/te-audience/tag/list-tags.ts': ["name: 'query'", "name: 'fields'", "name: 'limit'", "name: 'offset'"],
  'src/commands/te-audience/tag/list-tag-members.ts': ["name: 'query'", "name: 'fields'", "name: 'limit'", "name: 'offset'", ...lifecycleDescriptionTokens],
  'src/commands/te-audience/schema/get-cluster-definition-schema.ts': ["name: 'cluster_type'", "name: 'response_mode'", "name: 'condition_subtype'"],
  'src/commands/te-audience/schema/get-tag-definition-schema.ts': ["name: 'type'", "name: 'response_mode'", "name: 'condition_subtype'"],
};

for (const [relPath, tokens] of Object.entries(requiredTokensByFile)) {
  const absPath = path.join(ROOT, relPath);
  const content = fileContents.get(absPath);
  if (!content) {
    fail(`missing required command file: ${relPath}`);
  }
  for (const token of tokens) {
    if (!content.includes(token)) {
      fail(`missing required audience arg contract "${token}" in ${relPath}`);
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
  'skills/ae-analysis/references/list_cluster_members.md': lifecycleReferenceTokens,
  'skills/ae-analysis/references/list_tag_members.md': lifecycleReferenceTokens,
};

for (const [relPath, tokens] of Object.entries(requiredReferenceTokensByFile)) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    fail(`missing required reference file: ${relPath}`);
  }
  const content = fs.readFileSync(absPath, 'utf-8');
  for (const token of tokens) {
    if (!content.includes(token)) {
      fail(`missing required audience reference contract "${token}" in ${relPath}`);
    }
  }
}

const docsPath = path.join(ROOT, 'docs/te-analysis/te-analysis-mcp-tools.md');
if (!fs.existsSync(docsPath)) {
  fail('missing docs/te-analysis/te-analysis-mcp-tools.md');
}
const docsContent = fs.readFileSync(docsPath, 'utf-8');
for (const section of ['#### list_cluster_members', '#### list_tag_members']) {
  const start = docsContent.indexOf(section);
  if (start < 0) {
    fail(`missing audience docs section: ${section}`);
  }
  const nextSection = docsContent.indexOf('\n#### ', start + section.length);
  const body = docsContent.slice(start, nextSection < 0 ? undefined : nextSection);
  for (const token of [
    'fetch failed',
    'HTTP timeout',
    'backend query may still be running',
    'auto-generated requestId is not available',
    '+cancel_query --request_id',
    'metadata.requestId',
    'mcp_<32 lowercase hex UUID>',
    'mcp_0123456789abcdef0123456789abcdef',
  ]) {
    if (!body.includes(token)) {
      fail(`missing required audience docs contract "${token}" in ${section}`);
    }
  }
}

console.log(`OK: verified ${commands.length} analysis_audience tools are registered and aligned.`);
