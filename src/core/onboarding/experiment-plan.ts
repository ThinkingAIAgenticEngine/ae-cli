import { randomUUID } from 'node:crypto';
import path from 'node:path';
import catalog from '../../../skills/ae-onboarding/scripts/experiment-preset.json' with { type: 'json' };
import { CliApiError, LocalDataUploadError, PermissionError } from '../errors.js';
import { assembleSyncJsonBody, resolveSyncJsonEndpoint } from '../local-data-upload-client.js';
import { trustedProductHost } from './bootstrap-client.js';
import { CHECKOUT_RECOVERY, DEMO_STATUS, NETWORK_BUDGET_MS, UUID_PATTERN, onboardingGrowthScenario,
  type LocalSession, type OnboardingInput, type ReadyDemoScope } from './contracts.js';
import { readCheckoutRecoveryCohort } from './growth.js';
import { onboardingDraftReviewInteraction, onboardingInteraction } from './interaction.js';
import type { OnboardingDependencies } from './runtime.js';
import type { OnboardingStore } from './session-store.js';

const PROJECT_INFO = 'project.info.get';
const APPROVER_ADD = 'experiment.approver.add';
type ExperimentPlanDependencies = Pick<OnboardingDependencies, 'credentialKey' | 'capability' | 'upload' | 'approverOpenId' | 'now' | 'demoCurrency'>;
type ReviewDependencies = Pick<OnboardingDependencies, 'credentialKey'>;
type DemoStatus = Partial<ReadyDemoScope> & { status?: string };
type SavedPlan = Record<string, unknown> & { approver?: { status?: string }; answered_questions?: string[] };

function readActivePlan(store: OnboardingStore, deps: ReviewDependencies, input: OnboardingInput) {
  const { session_id: sessionId, run_id: runId } = input;
  if (!sessionId || !UUID_PATTERN.test(sessionId) || !runId || !/^[0-9a-f]{32}$/.test(runId)) {
    throw new Error('Pass the onboarding session ID and the run ID returned by experiment-plan.');
  }
  const session = store.session(sessionId, input.host ? trustedProductHost(input.host) : undefined)!;
  const file = `experiment-plan-${runId}.json`;
  const plan = store.read<SavedPlan>(file);
  const scope = session.ready_demo;
  if (!plan || plan.phase !== 'ready' || plan.session_id !== session.id || plan.run_id !== runId
      || !session.host || plan.host !== session.host || session.choice !== 'demo'
      || !scope || plan.sample_id !== session.sample_id || plan.sample_id !== scope.sample_id
      || plan.item_id !== scope.item_id || plan.demo_project_id !== scope.project_id
      || !session.credential_key || session.requires_auth || plan.credential_key !== session.credential_key
      || deps.credentialKey(session.host) !== session.credential_key) {
    throw new Error('The saved experiment plan does not match the active Demo session and account.');
  }
  return { file, plan };
}

function publicPlan(plan: SavedPlan): Record<string, unknown> {
  const { checkout_cohort: _cohort, credential_key: _key, ...review } = plan;
  return plan.approver?.status === 'deferred'
    ? { ...review, interaction: onboardingDraftReviewInteraction(plan.answered_questions) }
    : review;
}

export function readOnboardingExperimentPlan(store: OnboardingStore, deps: ReviewDependencies,
  input: OnboardingInput): Record<string, unknown> {
  return publicPlan(readActivePlan(store, deps, input).plan);
}

function recordAnsweredQuestion(store: OnboardingStore, deps: ReviewDependencies, input: OnboardingInput, preview: boolean) {
  const { session_id: sessionId, answered_question: question } = input;
  if (!sessionId || !UUID_PATTERN.test(sessionId) || !input.run_id || !question
      || input.scenario || input.draft_only || input.upload_metric_event || input.prepare_approver) {
    throw new Error('Use --session-id, --run-id, and --answered-question together for draft review.');
  }
  if (!onboardingDraftReviewInteraction().options.some(option => option.value === question && option.value !== 'launch')) {
    throw new Error('Use --answered-question review_audience, review_pilot, or review_no_reward.');
  }
  const update = () => {
    const { file, plan } = readActivePlan(store, deps, input);
    if (plan.approver?.status !== 'deferred') throw new Error('Only a plan saved with --draft-only supports review questions.');
    const answered = plan.answered_questions ?? [];
    const updated = answered.includes(question) ? plan : { ...plan, answered_questions: [...answered, question] };
    if (!preview && updated !== plan) store.write(file, updated);
    const result = publicPlan(updated);
    return preview ? { ...result, dry_run: true } : result;
  };
  return preview ? update() : store.locked(`session:${sessionId}`, async () => update());
}

export function readyDemoScope(demo: DemoStatus | undefined, session: LocalSession): ReadyDemoScope | undefined {
  if (demo?.status !== 'ready' || !demo.sample_id || demo.sample_id !== session.sample_id || typeof demo.item_id !== 'string' || !demo.item_id
      || typeof demo.project_id !== 'number' || !Number.isSafeInteger(demo.project_id)
      || demo.project_id <= 0 || demo.project_id === session.project_id) return undefined;
  return { sample_id: demo.sample_id, item_id: demo.item_id, project_id: demo.project_id,
    start_date: demo.start_date, end_date: demo.end_date, zone_offset: demo.zone_offset };
}

export async function runOnboardingExperimentPlan(
  store: OnboardingStore,
  deps: ExperimentPlanDependencies,
  input: OnboardingInput,
  preview: boolean,
): Promise<Record<string, unknown>> {
  if (input.run_id !== undefined || input.answered_question !== undefined) {
    return recordAnsweredQuestion(store, deps, input, preview);
  }
  const scenario = onboardingGrowthScenario(input.scenario);
  if (scenario === CHECKOUT_RECOVERY && input.upload_metric_event) {
    throw new Error('Checkout recovery prepares the plan locally. Use experiment-launch after the user confirms it.');
  }
  if (input.draft_only && (input.upload_metric_event || input.prepare_approver)) {
    throw new Error('Use --draft-only by itself to prepare a plan for review.');
  }
  const sessionId = input.session_id;
  if (!sessionId) throw new Error('A valid onboarding --session-id is required.');
  const explicitHost = input.host ? trustedProductHost(input.host) : undefined;
  if (preview) {
    const session = store.session(sessionId, explicitHost)!;
    return { dry_run: true, session_id: sessionId, host: session.host ?? null, sample_id: session.sample_id ?? null,
      currency: deps.demoCurrency(session.host, session.region),
      ...(input.scenario ? { scenario } : {}),
      capabilities: [...(session.ready_demo ? [] : [DEMO_STATUS]), ...(input.upload_metric_event ? [PROJECT_INFO] : []),
        ...(input.draft_only ? [] : [APPROVER_ADD])],
      ...(input.upload_metric_event ? { metric_event: { event_name: 'payment_success', record_count: 1 } } : {}) };
  }

  return store.locked(`session:${sessionId}`, async () => {
    const session = store.session(sessionId, explicitHost)!;
    const base = { session_id: sessionId, host: session.host ?? null, sample_id: session.sample_id ?? null };
    const host = session.host && trustedProductHost(session.host);
    if (!host || !session.credential_key || session.requires_auth || deps.credentialKey(host) !== session.credential_key) {
      return { ...base, phase: 'action_required', next_action: 'resume_onboarding' };
    }
    if (session.choice !== 'demo' || !session.sample_id) {
      return { ...base, phase: 'action_required', next_action: 'choose_demo' };
    }

    let scope = readyDemoScope({ ...session.ready_demo, status: 'ready' }, session);
    if (!scope) {
      const demo: DemoStatus | undefined = await deps.capability(host, DEMO_STATUS, { sample_id: session.sample_id },
        AbortSignal.timeout(NETWORK_BUDGET_MS));
      if (demo?.sample_id === session.sample_id && demo.status && demo.status !== 'ready') {
        return demo.status === 'action_required'
          ? { ...base, phase: 'action_required', next_action: 'inspect_demo_preparation' }
          : { ...base, phase: 'pending', next_action: 'poll_demo', poll_after_ms: 2000 };
      }
      scope = readyDemoScope(demo, session);
      if (!scope) throw new Error('AE did not confirm the active Demo project and item.');
      if (deps.credentialKey(host) !== session.credential_key) throw new Error('The active CLI account changed while reading Demo status.');
      session.ready_demo = scope;
      store.save(session);
    }

    const sampleId = scope.sample_id;
    const selection = Object.entries(catalog.industries).flatMap(([industry, { samples }]) =>
      Object.entries(samples).map(([id, sample]) => ({ industry, id, sample })))
      .find(({ id, sample }) => id === sampleId && sample.itemId === scope.item_id);
    if (!selection || !selection.sample.experimentTypes.includes(scenario)) {
      throw new Error('The active Demo sample and item have no supported experiment preset.');
    }
    const preset = catalog.experimentTypes[scenario];
    const currency = deps.demoCurrency(host, session.region);
    const checkoutCohort = scenario === CHECKOUT_RECOVERY ? readCheckoutRecoveryCohort(store, session, scope) : undefined;
    if (scenario === CHECKOUT_RECOVERY && !checkoutCohort) {
      return { ...base, phase: 'action_required', next_action: 'run_checkout_recovery_growth',
        message: 'Run onboarding growth with --scenario checkout-recovery for the active Demo first.' };
    }
    if (checkoutCohort && checkoutCohort.account_ids.length < 2) {
      return { ...base, phase: 'action_required', next_action: 'choose_growth_scenario',
        message: 'Checkout recovery needs at least two eligible Demo accounts.',
        interaction: onboardingInteraction('offer_growth_questions') };
    }
    const eventId = randomUUID();
    const runId = eventId.replaceAll('-', '');
    const audienceCount = checkoutCohort?.account_ids.length ?? selection.sample.followUpAccountIds.length;
    const result = {
      ...base, phase: 'ready', next_action: 'confirm_experiment', demo_project_id: scope.project_id,
      item_id: scope.item_id, industry: selection.industry, experiment_type: scenario, run_id: runId,
      interaction: input.draft_only ? onboardingDraftReviewInteraction() : onboardingInteraction('confirm_experiment'),
      ...(input.draft_only ? { answered_questions: [], review: { pilot_accounts_per_arm: Math.min(4, Math.floor(audienceCount / 2)) } } : {}),
      plan: {
        synthetic: true, hypothesis: preset.experiment.hypothesis,
        audience_count: audienceCount,
        audience: { minimum_view_days: preset.audience.minimumViewDays, view_event: preset.audience.viewEvent,
          exclude_event: preset.audience.excludeEvent,
          ...(checkoutCohort ? { checkout_event: catalog.experimentTypes[CHECKOUT_RECOVERY].audience.checkoutEvent,
            start_date: checkoutCohort.start_date, end_date: checkoutCohort.end_date } : {}) },
        duration_days: preset.durationDays, allocation: preset.allocation, bucket_id: preset.audience.bucketId,
        arms: Object.entries(preset.arms).map(([role, arm]) => ({ role, name: arm.name, allocation: arm.allocation, price: arm.price })),
        metrics: preset.metrics, currency, cost_per_paid_order: preset.costPerPaidOrder, other_costs: preset.otherCosts,
      },
    };
    const { control, treatment } = preset.arms;
    const planPreviewMarkdown = [
      '| A · Control | B · Treatment |',
      '| --- | --- |',
      `| ${control.name} | ${treatment.name} |`,
      `| ${control.price} ${currency} · ${control.allocation}% | ${treatment.price} ${currency} · ${treatment.allocation}% |`,
    ].join('\n');
    const file = `experiment-plan-${runId}.json`;
    const planPath = path.resolve(store.directory, file);
    const savePlan = (plan: Record<string, unknown>) => store.write(file, { ...plan,
      ...(input.draft_only ? { plan_preview_markdown: planPreviewMarkdown } : {}),
      ...(input.draft_only || checkoutCohort ? { credential_key: session.credential_key } : {}),
      ...(checkoutCohort ? { checkout_cohort: checkoutCohort } : {}) });
    if (input.draft_only) {
      const draft = { ...result, approver: { status: 'deferred' } };
      savePlan(draft);
      return { ...draft, plan_path: planPath, plan_preview_markdown: planPreviewMarkdown };
    }
    const metricEvent = input.upload_metric_event
      ? { event_name: preset.events.payment, event_id: eventId, persistence_verified: false }
      : undefined;
    savePlan({ ...result,
      ...(metricEvent ? { metric_event: { ...metricEvent, status: 'pending' } } : {}),
      approver: { status: 'pending' },
    });
    const [approver, delivery] = await Promise.all([
      prepareDemoApprover(deps, host, session.credential_key, scope.project_id),
      metricEvent ? uploadPlanPayment(deps, host, session.credential_key, scope, {
        '#type': 'track',
        '#event_name': metricEvent.event_name,
        '#account_id': selection.sample.followUpAccountIds[0],
        '#time': new Date(deps.now()).toISOString().slice(0, -1).replace('T', ' '),
        '#uuid': eventId,
        properties: {
          '#zone_offset': 0,
          plg_sample_id: sampleId,
          item_id: scope.item_id,
          amount: preset.arms.control.price,
          currency,
          order_id: eventId,
        },
      }) : undefined,
    ]);
    const preparedPlan = { ...result, approver,
      ...(delivery ? { metric_event: { ...metricEvent, ...delivery } } : {}) };
    savePlan(preparedPlan);
    return { ...preparedPlan, plan_path: planPath, plan_preview_markdown: planPreviewMarkdown };
  });
}

export async function prepareDemoApprover(deps: Pick<ExperimentPlanDependencies, 'credentialKey' | 'capability' | 'approverOpenId'>,
  host: string, credentialKey: string, projectId: number) {
  try {
    const signal = AbortSignal.timeout(NETWORK_BUDGET_MS);
    const openId = await deps.approverOpenId(host, signal);
    signal.throwIfAborted();
    if (!openId) throw new Error('The signed-in account has no available open ID.');
    if (deps.credentialKey(host) !== credentialKey) throw new Error('The active CLI account changed while preparing the approver.');
    const response = await deps.capability(host, APPROVER_ADD, { project_id: projectId, approvers: [openId] }, signal);
    signal.throwIfAborted();
    if (response?.result !== true) throw new Error('The Demo project did not acknowledge the approver registration.');
    return { status: 'ready' as const };
  } catch (error) {
    return { status: 'failed' as const, message: error instanceof Error ? error.message : 'Demo approver registration failed.',
      ...(error instanceof CliApiError || error instanceof PermissionError ? { code: error.code } : {}) };
  }
}

async function uploadPlanPayment(
  deps: ExperimentPlanDependencies, host: string, credentialKey: string, scope: ReadyDemoScope, event: Record<string, unknown>,
) {
  let endpoint: string;
  let appid: string;
  try {
    const project = await deps.capability(host, PROJECT_INFO, { project_id: scope.project_id }, AbortSignal.timeout(NETWORK_BUDGET_MS));
    if (project?.project_id !== scope.project_id || typeof project.appid !== 'string' || !project.appid.trim()
        || project.appid.trim().length > 256 || typeof project.public_receiver_address !== 'string') {
      return { status: 'not_sent', reason: 'demo_receiver_unavailable' };
    }
    const receiver = project.public_receiver_address.trim().replace(/\/+$/, '');
    if (!receiver) return { status: 'not_sent', reason: 'demo_receiver_unavailable' };
    endpoint = resolveSyncJsonEndpoint(receiver.endsWith('/sync_json') ? receiver : `${receiver}/sync_json`);
    appid = project.appid.trim();
    if (deps.credentialKey(host) !== credentialKey) return { status: 'not_sent', reason: 'account_changed' };
  } catch {
    return { status: 'not_sent', reason: 'demo_receiver_unavailable' };
  }
  try {
    await deps.upload(endpoint, assembleSyncJsonBody([JSON.stringify(event)], appid));
    return { status: 'receiver_accepted' };
  } catch (error) {
    if (error instanceof LocalDataUploadError) {
      return { status: error.meta?.delivery_state ?? 'unknown', code: error.code };
    }
    return { status: 'unknown' };
  }
}
