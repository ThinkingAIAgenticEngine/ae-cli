#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  console.log(`Usage: node skills/ae-analysis/scripts/project-semantic-knowledge-wiki/upload-kb-sources-concurrently.mjs \\
  --source-dir <output>-kb-upload-sources \\
  --namespace pskb-p<project_id> \\
  --kb-name <knowledge_base_name> \\
  --host <host> \\
  [--concurrency 4] [--max-concurrency 8] [--min-concurrency 1] \\
  [--cli-command "ae-cli"] [--cwd <repo>] [--summary-output <file>]

Uploads one Markdown source per kb +add call while running a bounded number of
single-file calls concurrently. Resumes by comparing remote displayName values
with local basenames in the selected namespace.`);
  process.exit(0);
}
const sourceDir = required('source-dir');
const namespace = required('namespace');
const kbName = required('kb-name');
const host = args.host || '';
const cwd = path.resolve(args.cwd || process.cwd());
const cliCommand = splitCommand(args['cli-command'] || 'ae-cli');
const initialConcurrency = Number.parseInt(args.concurrency || '4', 10);
const maxConcurrency = Number.parseInt(args['max-concurrency'] || String(Math.max(initialConcurrency, 8)), 10);
const minConcurrency = Number.parseInt(args['min-concurrency'] || '1', 10);
const progressEvery = Number.parseInt(args['progress-every'] || '25', 10);
const summaryPath = args['summary-output'] || '';

if (!Number.isInteger(initialConcurrency) || initialConcurrency < 1) fail('--concurrency must be a positive integer.');
if (!Number.isInteger(maxConcurrency) || maxConcurrency < initialConcurrency) fail('--max-concurrency must be >= --concurrency.');
if (!Number.isInteger(minConcurrency) || minConcurrency < 1 || minConcurrency > initialConcurrency) fail('--min-concurrency must be between 1 and --concurrency.');

const allFiles = fs.readdirSync(sourceDir)
  .filter((file) => file.startsWith(`${namespace}-`) && file.endsWith('.md'))
  .sort()
  .map((file) => path.resolve(sourceDir, file));

if (!allFiles.length) fail(`No upload source files found for namespace ${namespace} in ${sourceDir}.`);

const existing = await listExistingSources();
const queue = allFiles.filter((file) => !existing.has(path.basename(file)));
const successes = [];
const failures = [];
let completed = existing.size;
let concurrency = initialConcurrency;
let stableBatches = 0;

console.error(`[upload-kb] total=${allFiles.length} existing=${existing.size} remaining=${queue.length} concurrency=${concurrency}`);

while (queue.length && !failures.length) {
  const batch = queue.splice(0, concurrency);
  const results = await Promise.all(batch.map((file) => addWithRetry(file)));
  const sawRateLimit = results.some((result) => result.rateLimited);

  for (const result of results) {
    if (result.ok) {
      successes.push(path.basename(result.file));
      completed += 1;
      if (completed % progressEvery === 0 || completed === allFiles.length) {
        console.error(`[upload-kb] progress ${completed}/${allFiles.length} uploaded=${successes.length} failed=${failures.length} concurrency=${concurrency}`);
      }
    } else {
      failures.push(result.failure);
    }
  }

  if (sawRateLimit) {
    concurrency = Math.max(minConcurrency, Math.floor(concurrency / 2));
    stableBatches = 0;
    console.error(`[upload-kb] rate limit observed; reduce concurrency to ${concurrency}`);
  } else {
    stableBatches += 1;
    if (stableBatches >= 10 && concurrency < maxConcurrency) {
      concurrency += 1;
      stableBatches = 0;
      console.error(`[upload-kb] stable upload stretch; raise concurrency to ${concurrency}`);
    }
  }
}

const summary = {
  total: allFiles.length,
  existingBeforeUpload: existing.size,
  remainingAtStart: allFiles.length - existing.size,
  uploaded: successes.length,
  failed: failures.length,
  effectiveConcurrency: concurrency,
  failures,
};

if (summaryPath) fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
process.exit(failures.length ? 1 : 0);

async function listExistingSources() {
  if (args['no-resume']) return new Set();
  const cliArgs = ['kb', '+list-sources', '--name', kbName, '--format', 'json'];
  if (host) cliArgs.push('--host', host);
  const result = await runCli(cliArgs);
  if (result.code !== 0) {
    fail(`Unable to list existing KB sources before upload. Use --no-resume only when duplicate uploads are acceptable.\n${result.stderr || result.stdout}`);
  }
  const envelope = JSON.parse(result.stdout);
  if (!envelope.ok) fail(`KB source listing failed: ${JSON.stringify(envelope.error || envelope)}`);
  return new Set((envelope.data?.items || [])
    .map((item) => item.displayName)
    .filter((name) => name && name.startsWith(`${namespace}-`) && name.endsWith('.md')));
}

async function addWithRetry(file) {
  let rateLimited = false;
  let last = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const cliArgs = ['kb', '+add', '--name', kbName, '--files', JSON.stringify([file]), '--format', 'json'];
    if (host) cliArgs.push('--host', host);
    const result = await runCli(cliArgs);
    last = result;
    const text = `${result.stdout || ''}\n${result.stderr || ''}`;
    if (result.code === 0) return { ok: true, file, rateLimited };
    if (isRateLimit(text) && attempt < 5) {
      rateLimited = true;
      const waitMs = attempt * attempt * 4000;
      console.error(`[upload-kb] rate limited ${path.basename(file)} attempt=${attempt}; retry in ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    break;
  }
  return {
    ok: false,
    file,
    rateLimited,
    failure: {
      file: path.basename(file),
      status: last?.code ?? null,
      stdout: (last?.stdout || '').slice(0, 1200),
      stderr: (last?.stderr || '').slice(0, 1200),
    },
  };
}

function runCli(extraArgs) {
  return new Promise((resolve) => {
    const child = spawn(cliCommand[0], [...cliCommand.slice(1), ...extraArgs], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (error) => resolve({ code: 127, stdout, stderr: String(error?.message || error) }));
  });
}

function isRateLimit(text) {
  return /too frequent|frequent|rate|429|限流|频繁/i.test(text);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(tokens) {
  const parsed = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const next = tokens[i + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}

function splitCommand(command) {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) fail('--cli-command cannot be empty.');
  return parts;
}

function required(key) {
  const value = args[key];
  if (!value || value === true) fail(`Missing required --${key}.`);
  return value;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
