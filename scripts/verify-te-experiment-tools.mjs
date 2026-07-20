#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const commandsDir = path.join(ROOT, 'src/commands/te-experiment');
const SERVICE = 'experiment';
const EXPECTED_COMMANDS = [
  'save_experiment',
  'save_submit_experiment',
  'query_experiment_list',
  'query_experiment_detail',
  'check_experiment_ready',
  'manage_experiment',
  'batch_delete_experiment',
  'save_traffic_layer',
  'query_traffic_layer_detail',
  'query_traffic_layer_list',
  'batch_delete_traffic_layer',
  'query_experiment_report_summary',
  'query_experiment_sample_size_report',
  'query_experiment_metric_trend',
  'cancel_experiment_query_by_request_id',
  'save_metric',
  'query_metric_detail',
  'query_metric_list',
  'delete_metric',
  'save_feature',
  'manage_feature_status',
  'query_feature_detail',
  'query_feature_list',
  'batch_delete_feature',
  'query_bucket_list',
];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(commandsDir)) {
  fail(`missing commands directory: ${path.relative(ROOT, commandsDir)}`);
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
for (const file of commandFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const match = content.match(/command:\s*'\+([a-z0-9_-]+)'/);
  if (!match) {
    fail(`cannot parse command from ${path.relative(ROOT, file)}`);
  }
  commands.push(match[1]);
}

const commandSet = new Set(commands);
if (commandSet.size !== commands.length) {
  fail('duplicate experiment command names found in source files');
}

const expectedSet = new Set(EXPECTED_COMMANDS);
const missing = EXPECTED_COMMANDS.filter((name) => !commandSet.has(name));
const extra = commands.filter((name) => !expectedSet.has(name));
if (missing.length || extra.length) {
  fail(`experiment command mismatch: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`);
}

const help = spawnSync('npx', ['tsx', 'src/index.ts', SERVICE, '--help'], {
  cwd: ROOT,
  encoding: 'utf-8',
});

if (help.status !== 0) {
  process.stderr.write(help.stderr || '');
  fail(`failed to run ${SERVICE} --help`);
}

for (const tool of EXPECTED_COMMANDS) {
  const token = `+${tool}`;
  if (!help.stdout.includes(token)) {
    fail(`help output missing command: ${token}`);
  }
}

const dryRun = spawnSync(
  'npx',
  [
    'tsx',
    'src/index.ts',
    '--host',
    'https://example.test',
    '--dry-run',
    SERVICE,
    '+query_experiment_detail',
    '--project_id',
    '1',
    '--exp_id',
    'exp_1',
  ],
  { cwd: ROOT, encoding: 'utf-8' }
);

if (dryRun.status !== 0) {
  process.stderr.write(dryRun.stderr || '');
  fail('failed to run experiment dry-run');
}

const payload = JSON.parse(dryRun.stdout);
const data = payload.data;
if (data?.method !== 'MCP tools/call') {
  fail(`dry-run method mismatch: ${data?.method}`);
}
if (data?.url !== 'https://example.test/mcp/engage/http/experiment') {
  fail(`dry-run URL mismatch: ${data?.url}`);
}
if (data?.body?.serviceName !== 'experiment' || data?.body?.toolName !== 'query_experiment_detail') {
  fail(`dry-run MCP target mismatch: ${JSON.stringify(data?.body)}`);
}
if (data?.body?.arguments?.projectId !== 1 || data?.body?.arguments?.expId !== 'exp_1') {
  fail(`dry-run arguments mismatch: ${JSON.stringify(data?.body?.arguments)}`);
}

console.log(`OK: verified ${EXPECTED_COMMANDS.length} experiment tools are registered and aligned.`);
