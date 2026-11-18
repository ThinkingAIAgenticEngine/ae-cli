import type { Command, RuntimeContext } from '../../../framework/types.js';
import type { OnboardingAction } from '../../../core/onboarding/contracts.js';

function input(ctx: RuntimeContext) {
  return { host: ctx.hostOverride?.(), source: ctx.str('source') || undefined, region: ctx.str('region') || undefined, language: ctx.str('language') || undefined,
    website_env: ctx.str('website-env') || undefined, session_id: ctx.str('session-id') || undefined, choice: ctx.str('choice') || undefined, sample: ctx.str('sample') || undefined,
    scenario: ctx.str('scenario') || undefined,
    confirm_business_project_id: ctx.num('confirm-business-project-id') || undefined,
    browser: ctx.str('browser') || undefined, sdk_complete: ctx.bool('sdk-complete'),
    upload_metric_event: ctx.bool('upload-metric-event'), prepare_approver: ctx.bool('prepare-approver'), run_id: ctx.str('run-id') || undefined,
    start_only: ctx.bool('start-only') };
}

function invoke(ctx: RuntimeContext, action: OnboardingAction) {
  if (!ctx.onboarding) throw new Error('The runtime does not support PLG onboarding. Update the matching CLI.');
  return ctx.onboarding(action, input(ctx));
}

const sharedFlags = [
  { name: 'session-id', type: 'string' as const, required: false, desc: 'Private local continuation reference returned by an earlier onboarding command.' },
];
const scenarioFlag = { name: 'scenario', type: 'string' as const,
  desc: 'Demo growth scenario: item-coupon (default) or checkout-recovery.' };

export const onboardingRun: Command = {
  service: 'analysis', resource: 'onboarding', command: 'run', risk: 'write',
  description: 'Start or resume one bounded PLG onboarding step for the sample or business SDK integration.',
  flags: [...sharedFlags,
    { name: 'source', type: 'string', required: false, desc: 'Local AI tool: codex, claude-code, cursor, or other. This is not an authorization credential.' },
    { name: 'region', type: 'string', required: false, desc: 'Production onboarding market: jp, kr, or us.' },
    { name: 'language', type: 'string', required: false, desc: 'Conversation language: zh-CN, en-US, ja-JP, or ko-KR. Use --region for the market when it differs from the language default.' },
    { name: 'website-env', type: 'string', required: false, desc: 'Compatibility flag. Website onboarding uses production.' },
    { name: 'choice', type: 'string', required: false, desc: 'Select demo or business after the user chooses an experience.' },
    { name: 'sample', type: 'string', required: false, desc: 'Select a sample after the user chooses it: star-island or season-pass.' },
    { name: 'confirm-business-project-id', type: 'number', required: false, desc: 'Confirm the eligible business project for a legacy account.' },
    { name: 'sdk-complete', type: 'boolean', required: false, desc: 'Show the business project live-data link after the user confirms SDK setup.' },
    { name: 'browser', type: 'string', required: false, desc: 'Open website login and CLI authorization in the system default browser. Legacy values auto and agent also use the system browser.' },
  ],
  dryRun: ctx => invoke(ctx, 'plan'),
  execute: ctx => invoke(ctx, 'run'),
};

export const onboardingStatus: Command = {
  service: 'analysis', resource: 'onboarding', command: 'status', risk: 'read',
  description: 'Read PLG onboarding progress, authorization continuation and sample preparation without advancing.',
  flags: sharedFlags,
  dryRun: ctx => invoke(ctx, 'plan'),
  execute: ctx => invoke(ctx, 'status'),
};

export const onboardingGrowth: Command = {
  service: 'analysis', resource: 'onboarding', command: 'growth', risk: 'read',
  description: 'Analyze growth opportunities and the ordered purchase funnel for the active PLG Demo.',
  flags: [{ ...sharedFlags[0], required: true }, scenarioFlag],
  dryRun: ctx => invoke(ctx, 'growth-plan'),
  execute: ctx => invoke(ctx, 'growth'),
};

export const onboardingExperimentPlan: Command = {
  service: 'analysis', resource: 'onboarding', command: 'experiment-plan', risk: 'write',
  description: 'Generate an A/B experiment plan and optionally submit one synthetic payment to the active PLG Demo.',
  flags: [
    { ...sharedFlags[0], required: true },
    scenarioFlag,
    { name: 'prepare-approver', type: 'boolean', desc: 'Compatibility flag. All Demo experiment plans automatically add the signed-in account as an approver.' },
    { name: 'upload-metric-event', type: 'boolean', desc: 'Submit exactly one synthetic payment_success event to the current Demo project.' },
  ],
  dryRun: ctx => invoke(ctx, 'experiment-plan-preview'),
  execute: ctx => invoke(ctx, 'experiment-plan'),
};

export const onboardingExperimentLaunch: Command = {
  service: 'analysis', resource: 'onboarding', command: 'experiment-launch', risk: 'write',
  description: 'Create, approve, start and replay a confirmed synthetic PLG Demo experiment.',
  flags: [
    { ...sharedFlags[0], required: true },
    { name: 'run-id', type: 'string', required: true, desc: 'Run ID returned by experiment-plan for the confirmed Demo proposal.' },
    { name: 'start-only', type: 'boolean', desc: 'Return the link when the experiment is running. Resume with the same run ID to send the replay.' },
  ],
  dryRun: ctx => invoke(ctx, 'experiment-launch-preview'),
  execute: ctx => invoke(ctx, 'experiment-launch'),
};

export default [onboardingRun, onboardingStatus, onboardingGrowth, onboardingExperimentPlan, onboardingExperimentLaunch];
