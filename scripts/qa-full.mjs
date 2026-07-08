#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const tasks = [
  ['npm', ['run', 'build']],
  ['npm', ['test']],
  ['npm', ['run', 'verify:config']],
  ['npm', ['run', 'verify:analysis-tools']],
  ['npm', ['run', 'verify:analysis-cluster-routing']],
  ['npm', ['run', 'verify:multi-cluster-mode']],
  ['npm', ['run', 'verify:analysis-builder-dry-run']],
  ['npm', ['run', 'verify:analysis-audience-tools']],
  ['npm', ['run', 'verify:analysis-meta-tools']],
  ['npm', ['run', 'verify:analysis-common-tools']],
  ['npm', ['run', 'verify:team-tools']],
  ['npm', ['run', 'verify:agent-tools']],
  ['npm', ['run', 'verify:tracking-tools']],
  ['npm', ['run', 'verify:self-check-overlay']],
  ['npm', ['run', 'verify:update-check']],
  ['npm', ['run', 'self-check']]
];

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function formatTask([command, commandArgs]) {
  return [command, ...commandArgs].join(' ');
}

if (args.has('--help')) {
  console.log('Usage: npm run qa:full [-- --list]');
  console.log('Runs the full repository verification bundle.');
  process.exit(0);
}

if (args.has('--list')) {
  console.log(tasks.map(formatTask).join('\n'));
  process.exit(0);
}

for (const task of tasks) {
  run(task[0], task[1]);
}
