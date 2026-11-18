import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import catalog from '../../../skills/ae-onboarding/scripts/experiment-preset.json' with { type: 'json' };
import { CapabilityGatewayError } from '../capability-api.js';
import { CliApiError, LocalDataUploadError, PermissionError } from '../errors.js';
import { SecureStoreAuthError } from '../secure-store.js';
import { trustedProductHost } from './bootstrap-client.js';
import { CHECKOUT_RECOVERY, DEMO_STATUS, NETWORK_BUDGET_MS, UUID_PATTERN, type LocalSession, type OnboardingInput } from './contracts.js';
import { readyDemoScope } from './experiment-plan.js';
import { prepareExperimentReplay, runExperimentScript } from './experiment-replay.js';
import { onboardingExperimentUrl } from './interaction.js';
import type { OnboardingDependencies } from './runtime.js';
import type { OnboardingStore } from './session-store.js';

function isApprovalBlocker(error: unknown): boolean {
  return error instanceof SecureStoreAuthError || error instanceof PermissionError
    || (error instanceof CapabilityGatewayError
      && (error.httpStatus === 401 || error.httpStatus === 403 || error.type === 'validation'));
}

const SUBSCRIPTION_RETRY_DELAYS_MS = [500, 1_000, 1_500, 2_000, 3_000, 4_000];

interface Plan {
  phase: string;
  session_id: string;
  host: string;
  sample_id: string;
  item_id: string;
  demo_project_id: number;
  industry: string;
  experiment_type: string;
  run_id: string;
  approver?: { status: string };
  credential_key?: string;
  checkout_cohort?: { start_date: string; end_date: string; zone_offset: number; account_ids: string[] };
}

interface LaunchProgress {
  feature?: boolean;
  metric?: boolean;
  draft_attempted?: boolean;
  experiment_id?: string;
  experiment_status?: 'running';
  submission_attempted?: boolean;
  approval_id?: number;
  replay?: { status: string; record_count: number };
  timings_ms: Record<string, number>;
}

type Request = Record<string, unknown>;
interface MetricRequest extends Request {
  metricId: string;
  format: string;
  metricPurpose: string;
  metricDefinition: Request;
}
interface SaveRequests {
  feature: Request & { featureKey: string };
  metric: MetricRequest;
  revenueMetric: MetricRequest;
  experiment: Request & { expName: string; targeting: { definitionRequest: { conditions: { items: { values: string[] }[] } } } };
}
type LaunchDependencies = Pick<OnboardingDependencies, 'credentialKey' | 'capability' | 'upload' | 'approverOpenId' | 'now' | 'webConversation'>;

function matchesMetric(item: any, metric: MetricRequest): boolean {
  return item?.metric_id === metric.metricId && item.format === metric.format
    && item.metric_purpose === metric.metricPurpose && isDeepStrictEqual(item.metric_definition, metric.metricDefinition);
}

export async function runOnboardingExperimentLaunch(store: OnboardingStore, deps: LaunchDependencies,
  input: OnboardingInput, preview: boolean): Promise<Record<string, unknown>> {
  const { session_id: sessionId, run_id: runId } = input;
  if (!sessionId || !UUID_PATTERN.test(sessionId) || !runId || !/^[0-9a-f]{32}$/.test(runId)) {
    throw new Error('Pass the onboarding session ID and the run ID returned by experiment-plan.');
  }
  const hostOverride = input.host ? trustedProductHost(input.host) : undefined;
  const readSession = () => store.session(sessionId, hostOverride)!;
  const execute = async (session: LocalSession): Promise<Record<string, unknown>> => {
    const plan = store.read<Plan>(`experiment-plan-${runId}.json`);
    const scope = session.ready_demo;
    if (!plan || plan.phase !== 'ready' || plan.run_id !== runId || plan.session_id !== sessionId
        || !session.host || plan.host !== session.host || session.choice !== 'demo' || plan.sample_id !== session.sample_id
        || !scope || scope.sample_id !== plan.sample_id || scope.item_id !== plan.item_id
        || scope.project_id !== plan.demo_project_id || !Number.isSafeInteger(scope.project_id)
        || scope.project_id <= 0 || scope.project_id === session.project_id) {
      throw new Error('The saved experiment plan does not match the active Demo session and sample.');
    }
    const host = trustedProductHost(session.host);
    const project = { project_id: scope.project_id };
    const checkoutCohort = plan.experiment_type === CHECKOUT_RECOVERY ? plan.checkout_cohort : undefined;
    if (plan.experiment_type === CHECKOUT_RECOVERY && (!checkoutCohort
        || plan.credential_key !== session.credential_key || !Array.isArray(checkoutCohort.account_ids)
        || checkoutCohort.account_ids.length < 2)) {
      throw new Error('The checkout recovery plan no longer matches the verified Demo scope.');
    }
    const summary = { session_id: sessionId, run_id: runId, host, demo_project_id: scope.project_id,
      sample_id: scope.sample_id, item_id: scope.item_id,
      ...(checkoutCohort ? { experiment_type: plan.experiment_type } : {}) };
    if (preview) return { ...summary, dry_run: true, steps: [
      ...(checkoutCohort ? ['check_other_demo_experiment', 'verify_demo_scope'] : []),
      'save_metrics_and_feature', 'save_draft', 'check_readiness',
      'submit_approval', ...(plan.approver ? [] : ['add_signed_in_approver_if_needed']), 'approve', 'start',
      ...(input.start_only ? [] : ['upload_one_replay_batch'])] };

    const key = session.credential_key;
    const checkAccount = () => {
      if (!key || session.requires_auth || deps.credentialKey(host) !== key) {
        throw new Error('Resume onboarding with the signed-in account that generated the Demo plan.');
      }
    };
    const request = async (id: string, params: Request) => {
      checkAccount();
      const signal = AbortSignal.timeout(NETWORK_BUDGET_MS);
      const response = await deps.capability(host, id, params, signal);
      signal.throwIfAborted();
      return response;
    };
    checkAccount();
    const stateFile = `experiment-launch-${runId}.json`;
    const progress = store.read<LaunchProgress>(stateFile) ?? { timings_ms: {} };
    const persist = () => store.write(stateFile, progress);
    const result = (phase: string) => ({ ...summary, ...progress, phase,
      ...(progress.experiment_id && (progress.experiment_status === 'running' || progress.replay) ? {
        experiment_url: onboardingExperimentUrl(scope.project_id, progress.experiment_id, deps.webConversation ? undefined : host),
      } : {}),
      replay_receipt_path: progress.replay ? path.resolve(store.directory, `experiment-replay-${runId}.json`) : undefined });
    const completed = () => ({ ...result('complete'), experiment_status: 'running', approval_state: 'approved',
      persistence_verified: false, next_action: 'verify_experiment_results' });
    const started = () => ({ ...result('running'), approval_state: 'approved', next_action: 'upload_experiment_replay' });
    if (progress.replay?.status === 'receiver_accepted') return completed();
    if (progress.replay) return { ...result('action_required'), next_action: 'reconcile_replay_delivery' };

    let stage = 'prepare_requests';
    const call = (id: string, params: Request = {}) => request(id, { ...project, ...params });
    const measure = async <T>(name: string, action: () => Promise<T>): Promise<T> => {
      const start = deps.now();
      try { return await action(); }
      finally {
        progress.timings_ms[name] = (progress.timings_ms[name] ?? 0) + Math.max(0, deps.now() - start);
        persist();
      }
    };
    const timed = <T>(name: string, action: () => Promise<T>): Promise<T> => {
      stage = name;
      return measure(name, action);
    };
    const saveMetric = async (metric: MetricRequest) => {
      try {
        if ((await call('experiment.metric.save', { req: metric })).result !== true) throw new Error('Metric save was not acknowledged.');
      } catch (error) {
        const existing = await call('experiment.metric.get', { metric_id: metric.metricId }).catch(() => undefined);
        if (!matchesMetric(existing?.item, metric)) throw error;
      }
    };

    try {
      stage = 'check_other_demo_experiment';
      const otherType = plan.experiment_type === CHECKOUT_RECOVERY ? 'item-coupon' : CHECKOUT_RECOVERY;
      const otherName = catalog.experimentTypes[otherType].experiment.name;
      const [otherExperiments, currentDemo] = await Promise.all([
        progress.experiment_status ? undefined
          : call('experiment.experiment.list', { query_name: otherName }).catch(error => {
            if (!checkoutCohort && error instanceof CapabilityGatewayError && error.code === 'CAPABILITY_NOT_FOUND') return { items: [] };
            throw error;
          }),
        checkoutCohort && !progress.experiment_status ? request(DEMO_STATUS, { sample_id: scope.sample_id }) : undefined,
      ]);
      if (!progress.experiment_status && !Array.isArray(otherExperiments?.items)) {
        throw new Error('AE did not return the Demo experiment list.');
      }
      const active = otherExperiments?.items.find((item: { exp_name?: string; status?: string; exp_id?: string } | null) =>
        typeof item?.exp_name === 'string' && item.exp_name.startsWith(`${otherName} (`)
        && item.status !== 'draft' && item.status !== 'ended' && item.status !== 'archive');
      if (active) return { ...result('action_required'), next_action: 'wait_for_other_demo_experiment',
        message: 'Finish the other growth experiment for this Demo before starting this one.',
        ...(typeof active.exp_id === 'string' && active.exp_id ? {
          active_experiment_url: onboardingExperimentUrl(scope.project_id, active.exp_id, deps.webConversation ? undefined : host),
        } : {}) };
      if (checkoutCohort && !progress.experiment_status) {
        stage = 'verify_demo_scope';
        const verified = readyDemoScope(currentDemo, session);
        if (!verified || verified.item_id !== scope.item_id || verified.project_id !== scope.project_id
            || verified.start_date !== checkoutCohort.start_date || verified.end_date !== checkoutCohort.end_date
            || verified.zone_offset !== checkoutCohort.zone_offset) {
          return { ...result('action_required'), next_action: 'run_checkout_recovery_growth',
            message: 'The Demo scope changed. Refresh growth analysis and confirm a new experiment plan.' };
        }
      }
      stage = 'prepare_requests';
      const requestsFile = `experiment-requests-${runId}.json`;
      let requests = store.read<SaveRequests>(requestsFile);
      if (!requests) {
        const inputFile = `experiment-input-${runId}.json`;
        store.write(inputFile, { industry: plan.industry, experimentType: plan.experiment_type, sampleId: plan.sample_id,
          itemId: plan.item_id, runId, ...(checkoutCohort ? { accountIds: checkoutCohort.account_ids } : {}) });
        const generated: SaveRequests = JSON.parse(await runExperimentScript('experiment-requests.mjs', [path.join(store.directory, inputFile)]));
        store.write(requestsFile, generated);
        requests = generated;
      }
      const preset = requests;
      const projectInfo = input.start_only ? undefined : Promise.allSettled([call('project.info.get')]);
      const revenueKey = createHash('sha256').update(JSON.stringify([host, scope.project_id, preset.revenueMetric])).digest('hex');
      const revenueFile = `experiment-revenue-${revenueKey}.json`;
      if (!store.read(revenueFile)) await timed('save_revenue_metric', async () => {
        await saveMetric(preset.revenueMetric);
        store.write(revenueFile, { metric_id: preset.revenueMetric.metricId });
      });

      const assetSaves: [string, Promise<void>][] = [];
      if (!progress.feature) assetSaves.push(['save_feature', measure('save_feature', async () => {
        try {
          if ((await call('experiment.feature.save', { req: preset.feature })).result !== true) throw new Error('Feature save was not acknowledged.');
        } catch (error) {
          const existing = await call('experiment.feature.get', { feature_key: preset.feature.featureKey }).catch(() => undefined);
          if (existing?.item?.feature_key !== preset.feature.featureKey
              || existing.item.display_name !== preset.feature.displayName) throw error;
        }
        progress.feature = true;
      })]);
      if (!progress.metric) assetSaves.push(['save_primary_metric', measure('save_primary_metric', async () => {
        await saveMetric(preset.metric);
        progress.metric = true;
      })]);
      const outcomes = await Promise.allSettled(assetSaves.map(([, save]) => save));
      for (const [index, outcome] of outcomes.entries()) {
        if (outcome.status === 'rejected') {
          stage = assetSaves[index][0];
          throw outcome.reason;
        }
      }
      if (!progress.experiment_id) await timed('save_experiment', async () => {
        if (progress.draft_attempted) {
          const found = await call('experiment.experiment.list', { query_name: preset.experiment.expName });
          const matches = found.items?.filter((item: any) => item.exp_name === preset.experiment.expName);
          if (matches?.length === 1 && typeof matches[0].exp_id === 'string' && matches[0].exp_id) {
            progress.experiment_id = matches[0].exp_id;
            return;
          }
          if (matches?.length !== 0) throw new Error('The previous experiment save could not be reconciled to a unique draft.');
        }
        progress.draft_attempted = true;
        persist();
        const draft = await call('experiment.experiment.save', { req: preset.experiment });
        if (typeof draft.result !== 'string' || !draft.result) throw new Error('Experiment save returned no experiment ID.');
        progress.experiment_id = draft.result;
      });

      const exp = { exp_id: progress.experiment_id! };
      const approval = async () => (await call('experiment.approval.get', exp)).item;
      const verifyRound = (round: any) => {
        if (!Number.isSafeInteger(round?.approval_id) || round.approval_id <= 0
            || (progress.approval_id && round.approval_id !== progress.approval_id)
            || round.configuration?.exp_id !== exp.exp_id || round.configuration.exp_name !== preset.experiment.expName
            || !round.configuration.feature_key_list?.includes(preset.feature.featureKey)) {
          throw new Error('The approval round does not match this Demo draft.');
        }
        progress.approval_id = round.approval_id;
        persist();
      };
      if (!progress.experiment_status) await timed('approve_experiment', async () => {
        let round = progress.submission_attempted ? await approval() : undefined;
        if (!round) {
          if (progress.approval_id) throw new Error('The saved approval round is unavailable.');
          const readiness = (await call('experiment.experiment.ready-check', exp)).readiness;
          if (readiness?.valid !== true) throw new Error('The Demo experiment did not pass readiness checks.');
          progress.submission_attempted = true;
          persist();
          await call('experiment.approval.submit', exp);
          round = await approval();
        }
        verifyRound(round);
        if (round.state === 'approved') return;
        if (round.state !== 'pending_review') throw new Error(`The Demo approval is ${round.state}.`);
        if (!round.can_approve) {
          if (plan.approver) throw new Error('The signed-in account cannot approve this round. Check the Demo approver registration.');
          const openId = await deps.approverOpenId(host, AbortSignal.timeout(NETWORK_BUDGET_MS));
          if (!openId) throw new Error('The signed-in account has no available open ID.');
          await call('experiment.approver.add', { approvers: [openId] });
          round = await approval();
          verifyRound(round);
          if (round.state === 'approved') return;
          if (round.state !== 'pending_review' || !round.can_approve) throw new Error('The signed-in account cannot approve this round.');
        }
        let shouldApprove = true;
        let acknowledged = false;
        let delayMs = 500;
        for (;;) {
          if (shouldApprove) {
            checkAccount();
            try {
              acknowledged = (await call('experiment.approval.approve', { ...exp, approval_id: progress.approval_id })).result === true;
            } catch (error) {
              if (isApprovalBlocker(error)) throw error;
            }
          }
          // A failed write may already have taken effect. Read before sending it again.
          shouldApprove = false;
          checkAccount();
          try {
            round = await approval();
          } catch (error) {
            if (isApprovalBlocker(error)) throw error;
            round = undefined;
          }
          if (round) {
            verifyRound(round);
            if (round.state === 'approved') return;
            if (round.state !== 'pending_review') throw new Error(`The Demo approval is ${round.state}.`);
            if (!acknowledged && !round.can_approve) throw new Error('The signed-in account cannot approve this round.');
            shouldApprove = !acknowledged;
          }
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs = Math.min(delayMs * 2, 10_000);
        }
      });

      const effective = await timed('start_experiment', async () => {
        const detail = async () => (await call('experiment.experiment.get', exp)).item;
        let item = await detail();
        if (item?.exp_id !== exp.exp_id) throw new Error('The active experiment does not match the saved draft.');
        if (item.status === 'pending') {
          for (const [attempt, delay] of [0, ...SUBSCRIPTION_RETRY_DELAYS_MS].entries()) {
            if (delay) {
              await new Promise(resolve => setTimeout(resolve, delay));
              item = await detail();
              if (item?.exp_id !== exp.exp_id || item.status !== 'pending') break;
            }
            try {
              await call('experiment.experiment.manage', { ...exp, target_status: 'running' });
              item = await detail();
              break;
            } catch (error) {
              if (!(error instanceof Error) || !/subscription\.notReady|subscription is not ready/i.test(error.message)
                  || attempt === SUBSCRIPTION_RETRY_DELAYS_MS.length) throw error;
            }
          }
        }
        if (item?.exp_id !== exp.exp_id || item.status !== 'running') throw new Error('The experiment has not reached running status.');
        progress.experiment_status = 'running';
        return item;
      });

      if (!projectInfo) return started();
      await timed('upload_replay', async () => {
        const [lookup] = await projectInfo;
        if (lookup.status === 'rejected') throw lookup.reason;
        const info = lookup.value;
        const zoneOffset = info?.default_time_zone_offset;
        if (info?.project_id !== scope.project_id || typeof zoneOffset !== 'number' || !Number.isFinite(zoneOffset)
            || Math.abs(zoneOffset) > 14 || typeof info.appid !== 'string' || !info.appid.trim()
            || info.appid.trim().length > 256 || typeof info.public_receiver_address !== 'string' || !info.public_receiver_address.trim()) {
          throw new Error('The Demo project did not return a verified receiver, APPID and timezone.');
        }
        const controlId = effective.groups?.find((group: any) => group.is_control === 1)?.exp_group_id;
        const treatmentId = effective.groups?.find((group: any) => group.is_control === 0)?.exp_group_id;
        if (typeof controlId !== 'string' || typeof treatmentId !== 'string' || controlId === treatmentId) {
          throw new Error('The running experiment did not return both group IDs.');
        }
        const replay = await prepareExperimentReplay({ directory: store.directory, runId, industry: plan.industry,
          experimentType: plan.experiment_type, sampleId: plan.sample_id, itemId: plan.item_id,
          experimentId: exp.exp_id, controlId, treatmentId, startTime: effective.start_time,
          accountIds: preset.experiment.targeting.definitionRequest.conditions.items.map(item => item.values[0]),
          zoneOffset, appid: info.appid.trim(), receiver: info.public_receiver_address, now: deps.now });
        checkAccount();
        store.write(`experiment-replay-${runId}.json`, replay.receipt);
        progress.replay = { status: 'unknown', record_count: replay.count };
        persist();
        try {
          await deps.upload(replay.endpoint, replay.body);
        } catch (error) {
          if (error instanceof LocalDataUploadError && error.meta?.delivery_state === 'not_accepted') delete progress.replay;
          throw error;
        }
        progress.replay.status = 'receiver_accepted';
      });
      return completed();
    } catch (error) {
      return { ...result('action_required'), failed_stage: stage,
        next_action: progress.replay ? 'reconcile_replay_delivery' : 'resume_experiment_launch',
        error: { message: error instanceof Error ? error.message : 'The experiment workflow failed.',
          ...(error instanceof CliApiError || error instanceof LocalDataUploadError ? { code: error.code } : {}) } };
    }
  };
  return preview ? execute(readSession()) : store.locked(`session:${sessionId}`, async () => {
    const session = readSession();
    return session.ready_demo && session.host
      ? store.locked(`experiment:${session.host}:${session.ready_demo.project_id}`, () => execute(session))
      : execute(session);
  });
}
