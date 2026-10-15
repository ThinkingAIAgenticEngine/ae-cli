#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { runCompanyKb, invokeCompanyKbCli } from './company-kb.mjs';

const here = import.meta.dirname;
const missingCodes = new Set(['SCHEMA_NOT_FOUND', 'KB_SCHEMA_IMPORT_SCHEMA_NOT_FOUND']);

// Preparation never generates, validates with AI, applies rules, or compiles sources.
export async function prepareCompileSchema({ name, host, output, file, requestId }, invoke) {
  if (!name || !host || !output) throw new Error('--name, --host and --output are required.');
  if (fs.existsSync(output)) throw new Error('Output already exists; choose a new path.');
  const call = (command, flags = []) => runCompanyKb(command, ['--name', name, '--host', host, ...flags], invoke);
  const status = (await call('+status')).data;
  if (status.activeRunId || status.schemaStatus === 'generating' || status.buildStatus === 'compiling'
      || ['schema_generating', 'wiki_compiling', 'wiki_recovering', 'wiki_review_required'].includes(status.status)
      || status.publicationReview) {
    throw new Error(`Knowledge base is busy or requires publication review: ${status.status}`);
  }
  let absent = false;
  try {
    await call('+schema-download', ['--output', output]);
  } catch (error) {
    if (!missingCodes.has(error.code)) throw error;
    absent = true;
  }
  if (!absent && status.schemaValidation?.valid === true) {
    const bytes = fs.readFileSync(output);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (bytes.length > 262144 || [...text.trim()].length < 20) throw new Error('Downloaded formal rules failed basic checks.');
    return { schema_action: 'reuse', compile_ready: true, schema_file: path.resolve(output),
      schema_hash: createHash('sha256').update(bytes).digest('hex') };
  }
  // New KBs contain a placeholder file even though no effective rules exist yet.
  const uninitialized = status.schemaStatus === 'pending' && ['empty', 'schema_pending'].includes(status.status)
    && (!status.schemaValidation || status.schemaValidation.reason === 'DEFAULT_TEMPLATE');
  if (!uninitialized) throw new Error('Formal rules are invalid or their state is unknown; review explicitly before initialization.');
  if (!requestId) throw new Error('--request-id is required to initialize rules; reuse it when resuming the same upload.');
  const candidate = (await call('+schema-import', ['--file', file || path.join(here, 'default-compile-schema.md'),
    '--request-id', requestId])).data;
  return { schema_action: 'review_import', compile_ready: false, candidate,
    ...(absent ? {} : { schema_file: path.resolve(output) }) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2), values = {};
    const allowed = new Set(['name', 'host', 'output', 'file', 'request-id']);
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      if (!args[i].startsWith('--') || !allowed.has(key) || !args[i + 1] || args[i + 1].startsWith('--')) {
        throw new Error(`Invalid argument: ${args[i]}`);
      }
      values[key] = args[i + 1];
    }
    const result = await prepareCompileSchema({ ...values, requestId: values['request-id'] }, invokeCompanyKbCli);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
