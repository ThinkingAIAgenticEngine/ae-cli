import type { OnboardingDependencies } from './runtime.js';
import { replayReportDates } from './experiment-report-wait.js';
import { resolveEventSource, sqlString } from './growth.js';
import { OVERSEAS_TEST_PRODUCT_HOSTNAME } from './contracts.js';

const PROGRESS = 'analysis.plg_onboarding.progress';
const progressOrigins = new Set([
  'https://ae-web.thinkingai.cn',
  'https://ae-web-global.thinkingai.io',
  `https://${OVERSEAS_TEST_PRODUCT_HOSTNAME}`,
]);

export function isOnboardingProgressHost(host: string | undefined): boolean {
  if (!host) return false;
  try { return progressOrigins.has(new URL(host).origin); }
  catch { return false; }
}

interface ReplayArm {
  group_id: string;
  exposed_account_ids: string[];
  coupon_claim_account_ids: string[];
  paid_account_ids: string[];
}

export interface ProgressReceipt {
  sample_id: string;
  item_id: string;
  currency: string;
  start: string;
  end: string;
  timezone: string;
  arms: { control: ReplayArm; treatment: ReplayArm };
}

export interface OnboardingProgress {
  state: 'disabled' | 'unavailable' | 'not_started' | 'in_progress' | 'completed';
  version?: number;
  journey_id?: string;
  run_id?: string;
  demo_project_id?: number;
  experiment_id?: string;
  claim_granted?: boolean;
  receipt?: ProgressReceipt;
}

export function writeProgress(deps: Pick<OnboardingDependencies, 'capability'>, host: string,
  action: string, input: Record<string, unknown>): Promise<OnboardingProgress> {
  return deps.capability(host, PROGRESS, { action, ...input }, AbortSignal.timeout(5000));
}

export async function readProgress(deps: Pick<OnboardingDependencies, 'capability'>, host: string): Promise<OnboardingProgress> {
  try {
    const result = await writeProgress(deps, host, 'status', {});
    if (['disabled', 'unavailable', 'not_started', 'in_progress', 'completed'].includes(result?.state)) return result;
    return { state: 'unavailable' };
  } catch (error: any) {
    // Older product servers have no progress capability.
    return { state: error?.httpStatus === 404 || error?.code === 'CAPABILITY_NOT_FOUND' ? 'disabled' : 'unavailable' };
  }
}

export async function verifyAndCompleteProgress(deps: Pick<OnboardingDependencies, 'capability'>,
  host: string, runId: string): Promise<OnboardingProgress> {
  const progress = await readProgress(deps, host);
  if (progress.state !== 'in_progress') return progress;
  const { receipt, experiment_id, journey_id, demo_project_id } = progress;
  if (progress.run_id !== runId || !receipt || !experiment_id || !journey_id || !demo_project_id) {
    throw new Error('The current Demo replay checkpoint is not ready. Resume the experiment in the session that started it.');
  }

  const call = (id: string, input: Record<string, unknown>) =>
    deps.capability(host, id, input, AbortSignal.timeout(10000));
  const source = await resolveEventSource(call, demo_project_id);
  const dates = replayReportDates(receipt);
  const shiftDate = (date: string, days: number) =>
    new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
  const expected = new Set<string>();
  const key = (event: string, group: string, account: string) => JSON.stringify([event, group, account]);
  for (const arm of Object.values(receipt.arms)) {
    for (const account of arm.exposed_account_ids) expected.add(key('te_experiment_exposure', arm.group_id, account));
    for (const account of arm.coupon_claim_account_ids) expected.add(key('demo_coupon_claim', '', account));
    for (const account of arm.paid_account_ids) expected.add(key('payment_success', '', account));
  }
  if (!expected.size) throw new Error('The Demo replay checkpoint contains no events.');
  const sql = `SELECT DISTINCT e."$part_event", CAST(${source.account} AS varchar),
    CASE WHEN e."$part_event" = 'te_experiment_exposure' THEN CAST(e.experiment_group_id AS varchar) ELSE '' END
    FROM ${source.from}
    WHERE e."$part_date" BETWEEN ${sqlString(shiftDate(dates.start_time, -1))} AND ${sqlString(shiftDate(dates.end_time, 1))}
      AND ((e."$part_event" = 'te_experiment_exposure' AND CAST(e.experiment_id AS varchar) = ${sqlString(experiment_id)})
        OR (e.demo_run_id = ${sqlString(runId)} AND e.plg_sample_id = ${sqlString(receipt.sample_id)}
          AND e.item_id = ${sqlString(receipt.item_id)}
          AND (e."$part_event" = 'demo_coupon_claim'
            OR (e."$part_event" = 'payment_success' AND e.currency = ${sqlString(receipt.currency)}))))`;
  const rows = await call('analysis.adhoc.run', {
    project_id: demo_project_id, model_type: 'sql', definition: { sql }, use_cache: false,
  });
  if (rows?.has_more !== false || !Array.isArray(rows.rows)) {
    throw new Error('The Demo event query did not return a complete result.');
  }
  const found = new Set(rows.rows.map(([event, account, group]: string[]) => key(event, group, account)));
  if (found.size !== expected.size || [...expected].some(event => !found.has(event))) return progress;
  return writeProgress(deps, host, 'complete', { journey_id, run_id: runId, demo_project_id, experiment_id });
}
