#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { invokeCompanyKbCli, runCompanyKb } from './company-kb.mjs';

function failure(code, message) {
  return Object.assign(new Error(message), { code });
}

// Run lifecycle only: successful compilation still requires publication and content readback.
export async function waitForCompileRun(
  { name, runId, host, timeoutMs = 1_800_000, pollIntervalMs = 5_000 },
  invoke = invokeCompanyKbCli,
  { now = () => performance.now(), sleep = delay } = {},
) {
  if (![name, runId, host].every(value => typeof value === 'string' && value.trim())) {
    throw new Error('--name, --run-id and --host are required.');
  }
  if (![timeoutMs, pollIntervalMs].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('--timeout-ms and --poll-interval-ms must be positive integers.');
  }
  const deadline = now() + timeoutMs;
  let knowledgeBaseId;
  for (;;) {
    const remaining = Math.floor(deadline - now());
    if (remaining <= 0) throw failure('KB_COMPILE_WAIT_TIMEOUT', `Timed out waiting for compile run ${runId}.`);
    const result = await runCompanyKb('+status', ['--name', name, '--run-id', runId, '--host', host],
      flags => invoke(flags, { timeoutMs: Math.min(30_000, remaining) }));
    const { knowledgeBase, compileRun } = result.data ?? {};
    if (!compileRun || compileRun.id !== runId || knowledgeBase?.scope !== 'company' || !knowledgeBase.id
        || (knowledgeBaseId && knowledgeBase.id !== knowledgeBaseId)) {
      throw failure('KB_COMPILE_RUN_STATUS_UNSUPPORTED', 'Missing or mismatched compileRun identity; exact-run status support is required.');
    }
    knowledgeBaseId = knowledgeBase.id;
    if (result.data.publicationReview) {
      throw failure(result.data.publicationReview.code || 'KB_PUBLICATION_REVIEW_REQUIRED',
        `Compile run ${runId} requires administrator review; stop polling without cancelling or restarting the run.`);
    }
    if (compileRun.status === 'succeeded') return result;
    if (['failed', 'cancelled'].includes(compileRun.status)) {
      throw failure(`KB_COMPILE_${compileRun.status.toUpperCase()}`,
        `Compile run ${runId} ${compileRun.status}: ${compileRun.errorMessage || 'No error details returned.'}`);
    }
    if (!['queued', 'running'].includes(compileRun.status)) {
      throw failure('KB_COMPILE_RUN_STATUS_UNSUPPORTED', `Unexpected compile run status: ${compileRun.status}`);
    }
    const wait = Math.min(pollIntervalMs, deadline - now());
    if (wait > 0) await sleep(wait);
  }
}

// Installed Skills may be reached through a symlink; compare their resolved entry files.
function isCliEntry() {
  try {
    return process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    // stdin/eval launchers need not provide a real entry file when importing this module.
    return false;
  }
}
if (isCliEntry()) {
  try {
    const { values } = parseArgs({ options: {
      name: { type: 'string' }, 'run-id': { type: 'string' }, host: { type: 'string' },
      'timeout-ms': { type: 'string' }, 'poll-interval-ms': { type: 'string' },
    } });
    const result = await waitForCompileRun({
      name: values.name, runId: values['run-id'], host: values.host,
      ...(values['timeout-ms'] === undefined ? {} : { timeoutMs: Number(values['timeout-ms']) }),
      ...(values['poll-interval-ms'] === undefined ? {} : { pollIntervalMs: Number(values['poll-interval-ms']) }),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: { code: error.code ?? 'KB_COMPILE_WAIT_FAILED', message: error.message } }, null, 2));
    process.exitCode = 1;
  }
}
