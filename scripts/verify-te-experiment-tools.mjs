#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const COMMANDS_DIR = path.join(ROOT, 'src/commands/te-experiment');
const EXPECTED_L2 = [
  ['experiment', 'save', 'experiment.experiment.save'],
  ['experiment', 'list', 'experiment.experiment.list'],
  ['experiment', 'list-archived', 'experiment.experiment.list-archived'],
  ['experiment', 'get', 'experiment.experiment.get'],
  ['experiment', 'ready-check', 'experiment.experiment.ready-check'],
  ['experiment', 'conflict-check', 'experiment.experiment.conflict-check'],
  ['experiment', 'manage', 'experiment.experiment.manage'],
  ['experiment', 'update-group', 'experiment.experiment.update-group'],
  ['experiment', 'batch-delete', 'experiment.experiment.batch-delete'],
  ['operation-log', 'query', 'experiment.operation-log.query'],
  ['traffic-layer', 'save', 'experiment.traffic-layer.save'],
  ['traffic-layer', 'get', 'experiment.traffic-layer.get'],
  ['traffic-layer', 'list', 'experiment.traffic-layer.list'],
  ['traffic-layer', 'batch-delete', 'experiment.traffic-layer.batch-delete'],
  ['metric', 'save', 'experiment.metric.save'],
  ['metric', 'get', 'experiment.metric.get'],
  ['metric', 'list', 'experiment.metric.list'],
  ['metric', 'delete', 'experiment.metric.delete'],
  ['feature', 'save', 'experiment.feature.save'],
  ['feature', 'update-status', 'experiment.feature.update-status'],
  ['feature', 'get', 'experiment.feature.get'],
  ['feature', 'list', 'experiment.feature.list'],
  ['feature', 'version-list', 'experiment.feature.version-list'],
  ['feature operation-log', 'query', 'experiment.feature.operation-log.query'],
  ['feature', 'batch-delete', 'experiment.feature.batch-delete'],
  ['bucket', 'list', 'experiment.bucket.list'],
];
const EXPECTED_L3 = [
  'experiment.experiment.save-submit',
  'experiment.report.summary',
  'experiment.report.sample-size',
  'experiment.report.metric-trend',
  'experiment.query.cancel',
];

/** Fails verification with a stable error message. */
function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

/** Recursively returns TypeScript command files. */
function commandFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return commandFiles(target);
    if (!entry.name.endsWith('.ts') || ['index.ts', 'capability-shared.ts'].includes(entry.name)) return [];
    return [target];
  });
}

if (!fs.existsSync(COMMANDS_DIR)) fail('missing te-experiment command directory');

const actual = commandFiles(COMMANDS_DIR).map((file) => {
  const source = fs.readFileSync(file, 'utf8');
  const resource = source.match(/resource:\s*'([^']+)'/)?.[1];
  const command = source.match(/command:\s*'([^']+)'/)?.[1];
  const capabilityId = source.match(/capabilityId:\s*'([^']+)'/)?.[1];
  if (!resource || !command || !capabilityId) {
    fail(`cannot parse Capability command: ${path.relative(ROOT, file)}`);
  }
  if (command.startsWith('+')) fail(`legacy command remains: ${command}`);
  return `${resource} ${command} ${capabilityId}`;
});

const expected = EXPECTED_L2.map((item) => item.join(' '));
if (actual.length !== expected.length || expected.some((item) => !actual.includes(item))) {
  fail(`L2 command mismatch: expected ${expected.length}, found ${actual.length}`);
}

const skill = fs.readFileSync(path.join(ROOT, 'skills/ae-experiment/SKILL.md'), 'utf8');
for (const capabilityId of EXPECTED_L3) {
  if (!skill.includes(`capability run ${capabilityId}`)) {
    fail(`Skill missing L3 capability: ${capabilityId}`);
  }
}
if (/ae-cli experiment \+/.test(skill)) fail('Skill still exposes a legacy experiment + command');

const help = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts',
  'experiment', 'experiment', 'get', '--help'], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (help.status !== 0) fail(help.stderr || 'experiment get help failed');
if (!help.stdout.includes('--project-id') || !help.stdout.includes('--exp-id')) {
  fail('experiment get help is missing kebab-case flags');
}

const removed = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts',
  'experiment', '+query_experiment_list', '--help'], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (removed.status === 0) fail('legacy +query_experiment_list is still registered');

process.stdout.write(`OK: verified ${EXPECTED_L2.length} L2 and ${EXPECTED_L3.length} L3 experiment capabilities.\n`);
