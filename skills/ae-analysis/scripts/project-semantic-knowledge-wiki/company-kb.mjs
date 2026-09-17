#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const scoped = new Set(['+new', '+add', '+list-sources', '+schema', '+compile', '+status', '+import']);
const requestScoped = new Set(['+import-status']);
const directory = new Set(['+source-ls', '+source-read', '+source-put', '+source-rm']);
const value = (args, key) => args[args.indexOf(key) + 1];

// Project semantic KB operations must never fall back to a personal KB.
export async function runCompanyKb(command, args, invoke) {
  if (args.some((arg) => arg === '--custom-instructions' || arg.startsWith('--custom-instructions='))) {
    throw new Error('Use --custom-instructions-file for custom compiler rules.');
  }
  if (command === '+import' && args.some((arg) => arg === '--model' || arg.startsWith('--model=') || arg === '--custom-instructions-file' || arg.startsWith('--custom-instructions-file='))) {
    throw new Error('Snapshot import does not run the KB compiler; do not pass compiler model or custom rules.');
  }
  const preparedArgs = expandCustomInstructionsFile(args);
  if (preparedArgs.some((arg) => ['--scope', '--source', '--sources', '--format', '--jq'].some(
    (key) => arg === key || arg.startsWith(`${key}=`)))) {
    throw new Error('Scope/output overrides are not allowed; use company JSON output.');
  }
  const call = async (cmd, flags) => {
    const result = await invoke(['kb', cmd, ...flags]);
    if (!result || result.ok !== true) {
      throw new Error(`Company KB operation failed; stop without personal fallback: ${JSON.stringify(result?.error ?? result)}`);
    }
    return result;
  };
  if (command === '+list') {
    const result = await call(command, preparedArgs);
    if (!Array.isArray(result.data)) throw new Error('Unexpected KB list response.');
    return { ...result, data: result.data.filter((kb) => kb.scope === 'company') };
  }
  if (requestScoped.has(command)) {
    if (!args.includes('--request-id') || !value(args, '--request-id')) throw new Error('--request-id is required.');
    const result = await call(command, preparedArgs);
    if (result.data?.scope && result.data.scope !== 'company') throw new Error('Import status did not return a company KB; stop without personal fallback.');
    return result;
  }
  if (!args.includes('--name') || !value(args, '--name')) throw new Error('--name is required.');
  const name = value(args, '--name');
  if (scoped.has(command)) {
    const result = await call(command, [...preparedArgs, '--scope', 'company']);
    if (command === '+new' && result.data?.scope !== 'company') throw new Error('Creation did not return a company KB; stop.');
    if (command === '+import' && result.data?.scope && result.data.scope !== 'company') throw new Error('Snapshot import did not return a company KB; stop.');
    if (command === '+add') {
      const upload = result.data?.result;
      if (!upload?.results?.length || upload.summary?.failed !== 0
          || upload.results.some((item) => item.status !== 'created')) {
        throw new Error(`Source upload was not completely successful; stop: ${JSON.stringify(upload)}`);
      }
    }
    return result;
  }
  if (directory.has(command)) {
    if (!args.includes('--id') || !value(args, '--id')) throw new Error('--id is required.');
    const targetArgs = ['--name', name, '--scope', 'company'];
    if (args.includes('--host')) targetArgs.push('--host', value(args, '--host'));
    const sources = await call('+list-sources', targetArgs);
    const source = sources.data?.items?.find((item) => item.id === value(args, '--id'));
    if (!source || source.sourceType !== 'zip') throw new Error('ZIP source is not in the exact company KB; stop.');
    // Directory endpoints currently resolve by name and source ID, without a scope flag.
    // Verify ownership through the scope-aware source endpoint before every operation.
    return call(command, preparedArgs);
  }
  if (['+index', '+grep', '+read'].includes(command)) {
    const flags = [...preparedArgs];
    flags.splice(flags.indexOf('--name'), 2);
    const ref = { scope: 'company', name };
    flags.push(command === '+read' ? '--source' : '--sources', JSON.stringify(command === '+read' ? ref : [ref]));
    return call(command, flags);
  }
  throw new Error(`Unsupported project KB operation: ${command}`);
}

function expandCustomInstructionsFile(args) {
  const fileIndex = args.indexOf('--custom-instructions-file');
  if (fileIndex === -1) return args;
  if (fileIndex + 1 >= args.length || args[fileIndex + 1].startsWith('--')) {
    throw new Error('--custom-instructions-file requires a file path.');
  }
  if (args.includes('--custom-instructions')) {
    throw new Error('Use either --custom-instructions or --custom-instructions-file, not both.');
  }
  const content = fs.readFileSync(args[fileIndex + 1], 'utf8');
  if (!content.trim()) throw new Error('--custom-instructions-file is empty.');
  if ([...content].length > 10000) throw new Error('--custom-instructions-file exceeds 10000 characters.');
  return [
    ...args.slice(0, fileIndex),
    '--custom-instructions',
    content,
    ...args.slice(fileIndex + 2),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [command, ...args] = process.argv.slice(2);
    const result = await runCompanyKb(command, args, (flags) => {
      const child = spawnSync('ae-cli', flags, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
      if (child.stderr) process.stderr.write(child.stderr);
      if (child.error || child.status !== 0) throw new Error(child.error?.message || child.stderr || child.stdout || 'CLI failed.');
      return JSON.parse(child.stdout);
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
