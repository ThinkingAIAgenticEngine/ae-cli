import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { assembleSyncJsonBody, resolveSyncJsonEndpoint } from '../local-data-upload-client.js';
import { getLocalCliPackageInfo } from '../package-info.js';
import type { LocalDataMapping } from '../../commands/data-integration/types.js';

const exec = promisify(execFile);
const OUTCOME_DELAY_MS = 5_000;

export async function runExperimentScript(script: string, args: string[]): Promise<string> {
  const { root } = getLocalCliPackageInfo();
  if (!root) throw new Error('The PLG preset scripts could not be located in this CLI package.');
  const { stdout } = await exec(process.execPath,
    [path.join(root, 'skills', 'ae-onboarding', 'scripts', script), ...args], { timeout: 15_000 });
  return stdout;
}

export async function prepareExperimentReplay(options: {
  directory: string; runId: string; industry: string; experimentType: string; sampleId: string; itemId: string;
  experimentId: string; controlId: string; treatmentId: string; accountIds: string[];
  startTime: string; zoneOffset: number; appid: string; receiver: string; now: () => number;
}) {
  const receiver = options.receiver.trim().replace(/\/+$/, '');
  const endpoint = resolveSyncJsonEndpoint(receiver.endsWith('/sync_json') ? receiver : `${receiver}/sync_json`);
  const offsetMinutes = Math.round(options.zoneOffset * 60);
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
  const timezone = `${offsetMinutes < 0 ? '-' : '+'}${hours}:${minutes}`;
  const now = options.now();
  const offsetMs = offsetMinutes * 60_000;
  const midnight = Math.floor((now + offsetMs) / 86_400_000) * 86_400_000 - offsetMs;
  const experimentStart = Date.parse(options.startTime);
  if (!Number.isFinite(experimentStart) || experimentStart > now) throw new Error('The running experiment has no elapsed start time.');
  const start = Math.max(experimentStart, midnight, now - OUTCOME_DELAY_MS);
  const end = start + OUTCOME_DELAY_MS;

  const directory = await mkdtemp(path.join(options.directory, 'experiment-replay-'));
  try {
    const cohort = path.join(directory, 'cohort.json');
    const replay = path.join(directory, 'replay');
    await writeFile(cohort, JSON.stringify(options.accountIds), { mode: 0o600 });
    await runExperimentScript('generate.mjs', [
      '--phase=plg-experiment-today', `--run-id=${options.runId}`, `--industry=${options.industry}`,
      `--experiment-type=${options.experimentType}`, `--sample-id=${options.sampleId}`, `--item-id=${options.itemId}`,
      `--cohort-file=${cohort}`, `--experiment-id=${options.experimentId}`, `--control-id=${options.controlId}`,
      `--treatment-id=${options.treatmentId}`, `--start=${new Date(start).toISOString()}`,
      `--end=${new Date(end).toISOString()}`, `--timezone=${timezone}`, `--output-dir=${replay}`,
    ]);
    const receipt = JSON.parse(await readFile(path.join(replay, 'plg-experiment-receipt.json'), 'utf8'));
    const mapping: LocalDataMapping = JSON.parse(await readFile(path.join(replay, 'replay.mapping.json'), 'utf8'));
    const { convertLocalData } = await import('../../commands/data-integration/conversion.js');
    const converted = await convertLocalData({
      inputFile: path.join(replay, 'replay.jsonl'), mapping, outputDir: path.join(directory, 'converted'),
      now: new Date(options.now()),
    });
    const rows = (await readFile(path.join(converted.output_dir, converted.manifest.output.valid_file), 'utf8')).trim().split('\n');
    const count = receipt.event_uuids.exposure.length + receipt.event_uuids.outcomes.length;
    if (converted.status !== 'ready' || count === 0 || converted.manifest.output.invalid_records !== 0
        || rows.length !== count || converted.manifest.output.valid_records !== count) {
      throw new Error('The complete Demo replay did not pass data conversion.');
    }
    return { endpoint, body: assembleSyncJsonBody(rows, options.appid), receipt, count };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
