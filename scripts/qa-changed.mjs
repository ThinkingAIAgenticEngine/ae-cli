#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function collectGitFiles(commandArgs) {
  const result = spawnSync('git', commandArgs, { encoding: 'utf8' });
  if (result.status !== 0) {
    return [];
  }
  return result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

function changedFiles() {
  return [...new Set([
    ...collectGitFiles(['diff', '--name-only', 'HEAD']),
    ...collectGitFiles(['ls-files', '--others', '--exclude-standard'])
  ])];
}

function needs(files, patterns) {
  return files.some((file) => patterns.some((pattern) => pattern.test(file)));
}

function tasksFor(files) {
  const tasks = [
    ['npm', ['run', 'build']],
    ['npm', ['test']]
  ];

  if (needs(files, [/^(AGENTS|CLAUDE)\.md$/])) {
    tasks.push(['npm', ['run', 'check:agents-docs']]);
  }

  if (needs(files, [/^src\/commands\/te-analysis\//, /^skills\/ae-analysis\//, /^docs\/te-analysis\//, /^scripts\/verify-te-analysis/, /^test\/multi-cluster-mode\.test\.mjs$/])) {
    tasks.push(
      ['npm', ['run', 'verify:analysis-tools']],
      ['npm', ['run', 'verify:analysis-cluster-routing']],
      ['npm', ['run', 'verify:multi-cluster-mode']],
      ['npm', ['run', 'verify:analysis-builder-dry-run']],
      ['npm', ['run', 'verify:analysis-audience-tools']],
      ['npm', ['run', 'verify:analysis-meta-tools']],
      ['npm', ['run', 'verify:analysis-common-tools']]
    );
  }

  if (needs(files, [/^src\/commands\/team\//, /^scripts\/verify-te-team-tools\.mjs$/])) {
    tasks.push(['npm', ['run', 'verify:team-tools']]);
  }
  if (needs(files, [/^src\/commands\/agent\//, /^scripts\/verify-agent-tools\.mjs$/])) {
    tasks.push(['npm', ['run', 'verify:agent-tools']]);
  }
  if (needs(files, [/tracking/i, /^test\/tracking-/])) {
    tasks.push(['npm', ['run', 'verify:tracking-tools']]);
  }
  if (needs(files, [/self-check/i])) {
    tasks.push(['npm', ['run', 'verify:self-check-overlay']]);
  }
  if (needs(files, [/update-check/i])) {
    tasks.push(['npm', ['run', 'verify:update-check']]);
  }
  if (needs(files, [/^test\/config-commands\.test\.mjs$/, /^src\/commands\/config\//])) {
    tasks.push(['npm', ['run', 'verify:config']]);
  }

  return tasks;
}

function formatTask([command, commandArgs]) {
  return [command, ...commandArgs].join(' ');
}

if (args.has('--help')) {
  console.log('Usage: npm run qa:changed [-- --list]');
  console.log('Runs build, smoke test, and changed-domain verify scripts.');
  process.exit(0);
}

const files = changedFiles();
const tasks = tasksFor(files);

if (args.has('--list')) {
  console.log(tasks.map(formatTask).join('\n'));
  process.exit(0);
}

for (const task of tasks) {
  run(task[0], task[1]);
}
