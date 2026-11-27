import { isOnboardingProgressHost, readProgress, verifyAndCompleteProgress, writeProgress } from './progress.js';
import crypto from 'node:crypto';
import path from 'node:path';
import { localDataUpload } from '../local-data-upload-client.js';
import { getActiveHost } from '../config.js';
import { peekCliToken, getCliToken, validateCliTokenOnServer } from '../cli-token.js';
import { assertCredentialsReadable, loadCliToken, getActiveCredential } from '../secure-store.js';
import { executeCapability } from '../capability-api.js';
import { pollDeviceToken, openBrowser, buildVerificationUrl, type PollResult, type DeviceAuthorizeResponse } from '../device-auth.js';
import { authorizeLoginDevice, resolveDeviceSessionRoute } from '../login-device-flow.js';
import { fetchCliConfig } from '../compat-check.js';
import { getLocalCliPackageInfo } from '../package-info.js';
import { readExternalCliToken } from '../external-cli-token.js';
import { existingAccountOptions, localRegistrationLanguage, normalizeRegistrationLanguage, onboardingDeviceMarket, registrationLanguage, registrationMarket, type AeRegistrationLanguage } from '../host-guidance.js';
import { cliEntrySource, isProductionWebsiteOrigin, OVERSEAS_TEST_MARKETS, OVERSEAS_TEST_WEBSITE_ORIGIN,
  WEBSITE_MARKETS, websiteEnvironment, websiteOrigin } from '../website-entry.js';
import { createBootstrap, readBootstrap, claimBootstrapDevice, bootstrapOrigin, trustedProductHost, type BootstrapState } from './bootstrap-client.js';
import { verifyWebsiteLoginIdentity } from './website-login-identity.js';
import { OnboardingStore } from './session-store.js';
import { runOnboardingGrowth } from './growth.js';
import { runOnboardingExperimentLaunch } from './experiment-launch.js';
import { readOnboardingExperimentPlan, readyDemoScope, runOnboardingExperimentPlan } from './experiment-plan.js';
import { identifyWorkspaceProjects } from './workspace-projects.js';
import { onboardingDemoOverview, onboardingEvidenceLinks, onboardingInteraction } from './interaction.js';
import { onboardingBrowserPolicy, readBrowserMode, type OnboardingBrowserReceipt, type OnboardingBrowserTarget } from './browser-policy.js';
import { DEMO_CONTEXT, DEMO_ENSURE, DEMO_STATUS, DEMO_SAMPLE_IDS, RUN_BUDGET_MS, NETWORK_BUDGET_MS,
  OVERSEAS_TEST_PRODUCT_HOSTNAME, US_ONBOARDING_LANGUAGE, UUID_PATTERN, isUsOnboarding, onboardingDemoCurrency,
  type OnboardingAction, type OnboardingInput, type LocalSession } from './contracts.js';

/** Reuse auth login navigation; reverse proxies may put an internal origin in Agent URL metadata. */
export function agentVerificationUrl(base: string, authorization: DeviceAuthorizeResponse, language?: AeRegistrationLanguage): string {
  let issuer: URL;
  try { issuer = new URL(base); }
  catch { throw new Error('The selected Agent authentication issuer is invalid.'); }
  if (!['http:', 'https:'].includes(issuer.protocol) || issuer.username || issuer.password || /[?#]/.test(issuer.href)) {
    throw new Error('The selected Agent authentication issuer is unsafe.');
  }
  if (typeof authorization.user_code !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(authorization.user_code)) {
    throw new Error('The Agent returned an invalid user code.');
  }
  const target = new URL(buildVerificationUrl(issuer.toString(), authorization.user_code, authorization.device_code.startsWith('uba_') ? 'uba' : 'legacy'));
  if (language) target.searchParams.set('locale', language);
  return target.href;
}

/** Accept the legacy readiness alias without depending on a browser acknowledgement. */
function readyAccountHost(state: BootstrapState, expectedHost?: string): string | undefined {
  if (state.status !== 'account_ready' && state.status !== 'browser_ready') return undefined;
  if (!state.host) throw new Error('The website did not return a trusted product host.');
  const host = trustedProductHost(state.host);
  if (expectedHost && expectedHost !== host) throw new Error('The verified account belongs to another product host. Start a separate continuation.');
  return host;
}

function clearAccountScope(session: LocalSession) {
  delete session.project_id;
  delete session.bootstrap;
  delete session.device;
  delete session.requires_auth;
  delete session.website_device;
  delete session.choice;
  delete session.sample_id;
  delete session.ready_demo;
  delete session.journey_id;
  delete session.demo_visits;
  delete session.confirmed_business_project_id;
}

export interface OnboardingDependencies {
  activeHost(): string;
  authenticated(host: string): boolean;
  credentialKey(host: string): string | undefined;
  machineLoginAllowed(host?: string): boolean;
  webConversation?: boolean;
  webMarket?: string;
  demoCurrency: typeof onboardingDemoCurrency;
  createBootstrap: typeof createBootstrap;
  readBootstrap: typeof readBootstrap;
  claimBootstrapDevice: typeof claimBootstrapDevice;
  verifyWebsiteLoginIdentity: typeof verifyWebsiteLoginIdentity;
  authorize(host: string, signal?: AbortSignal): Promise<{ baseUrl: string; authorization: DeviceAuthorizeResponse }>;
  poll(host: string, code: string, signal?: AbortSignal): Promise<PollResult>;
  persist(host: string, tokens: any, signal: AbortSignal): Promise<void>;
  capability(host: string, id: string, input: Record<string, unknown>, signal: AbortSignal): Promise<any>;
  upload: typeof localDataUpload;
  approverOpenId(host: string, signal: AbortSignal): Promise<string | undefined>;
  compatibility(host: string, signal: AbortSignal): Promise<unknown>;
  open(url: string): boolean;
  now(): number;
}

const defaults: OnboardingDependencies = {
  activeHost: () => readExternalCliToken()?.url ?? getActiveHost(),
  authenticated(host) {
    if (readExternalCliToken(host)) return true;
    if (process.env.TE_AGENT_CLI_CONFIG_DIR !== undefined) return Boolean(peekCliToken(host));
    assertCredentialsReadable(host);
    return Boolean(loadCliToken(host));
  },
  credentialKey(host) {
    const token = readExternalCliToken(host)?.token
      ?? (process.env.TE_AGENT_CLI_CONFIG_DIR !== undefined ? peekCliToken(host) : loadCliToken(host));
    return token ? crypto.createHash('sha256').update(token).digest('hex') : undefined;
  },
  machineLoginAllowed: host => !readExternalCliToken(host),
  demoCurrency: onboardingDemoCurrency,
  createBootstrap, readBootstrap, claimBootstrapDevice, verifyWebsiteLoginIdentity,
  authorize: authorizeLoginDevice,
  poll: (issuer, code, signal) => pollDeviceToken(issuer, code, code.startsWith('uba_') ? 'uba' : 'legacy', signal),
  async persist(host, tokens, signal) {
    const { persistDeviceTokens, activateHostAfterLogin } = await import('../../commands/auth.js');
    await persistDeviceTokens(host, tokens, { signal, checkCompatibility: false });
    activateHostAfterLogin(host, host);
  },
  upload: localDataUpload,
  async approverOpenId(host, signal) {
    const external = readExternalCliToken(host);
    const stored = !external && process.env.TE_AGENT_CLI_CONFIG_DIR === undefined ? getActiveCredential(host) : null;
    if (stored?.account?.openId) return stored.account.openId;
    const token = external?.token ?? await getCliToken(host, signal);
    return (await validateCliTokenOnServer(host, token, signal)).account?.openId;
  },
  capability: (host, id, input, signal) => executeCapability(host, id.startsWith('experiment.') ? 'engage' : 'analysis', id, input, { signal }),
  async compatibility(host, signal) {
    const config = await fetchCliConfig(host, await getCliToken(host, signal), signal);
    signal.throwIfAborted();
    return config ? { current: getLocalCliPackageInfo().version, expected: config.aeCliVersion, cluster: config.clusterVersion } : undefined;
  },
  open: openBrowser, now: Date.now,
};

/** One bounded invocation. Network and local operations share the same deadline. */
export class OnboardingRuntime {
  readonly dependencies: OnboardingDependencies;
  constructor(readonly store = new OnboardingStore(), dependencies: Partial<OnboardingDependencies> = {}) {
    this.dependencies = { ...defaults, ...dependencies };
  }

  async invoke(action: OnboardingAction, input: OnboardingInput): Promise<Record<string, unknown>> {
    if (action === 'progress' || action === 'progress-preview') {
      const active = input.host ?? this.dependencies.activeHost();
      const host = active ? trustedProductHost(active) : undefined;
      if (action === 'progress-preview') return { dry_run: true, action: input.run_id ? 'complete' : 'status', host };
      if (!host || (!this.dependencies.webConversation && !isOnboardingProgressHost(host))
          || !this.dependencies.authenticated(host)) return { state: 'disabled' };
      if (!input.run_id) {
        const { receipt: _receipt, ...progress } = await readProgress(this.dependencies, host);
        return progress;
      }
      if (!/^[0-9a-f]{32}$/.test(input.run_id)) throw new Error('Pass the run ID returned by experiment-plan.');
      const market = this.dependencies.webMarket ?? this.store.session(undefined, host)?.region;
      const { receipt: _receipt, ...progress } = await verifyAndCompleteProgress(this.dependencies, host, input.run_id, market);
      return progress;
    }
    if ((action === 'status' || action === 'plan') && input.run_id) {
      const draft = readOnboardingExperimentPlan(this.store, this.dependencies, input);
      return action === 'plan' ? { ...draft, dry_run: true } : draft;
    }
    if (action === 'growth' || action === 'growth-plan') {
      return runOnboardingGrowth(this.store, this.dependencies, input, action === 'growth-plan');
    }
    if (action === 'experiment-plan' || action === 'experiment-plan-preview') {
      return runOnboardingExperimentPlan(this.store, this.dependencies, input, action === 'experiment-plan-preview');
    }
    if (action === 'experiment-launch' || action === 'experiment-launch-preview') {
      return runOnboardingExperimentLaunch(this.store, this.dependencies, input, action === 'experiment-launch-preview');
    }
    const browserMode = readBrowserMode(input.browser);
    const webConversation = this.dependencies.webConversation;
    if (input.choice && input.choice !== 'demo' && input.choice !== 'business') throw new Error('Choose demo or business.');
    if (input.sample && !DEMO_SAMPLE_IDS.some(sample => sample === input.sample)) throw new Error('Unknown demo sample.');
    if (input.choice === 'business' && input.sample) throw new Error('A sample requires the demo choice.');
    if (input.language && !normalizeRegistrationLanguage(input.language)) throw new Error('Unsupported onboarding language. Use zh-CN, en-US, ja-JP, or ko-KR.');
    if (input.source && !['codex', 'claude-code', 'cursor', 'other'].includes(input.source)) throw new Error('Unsupported local AI tool source.');
    const explicitHost = input.host ? trustedProductHost(input.host) : undefined;
    const pinnedSession = input.session_id ? this.store.session(input.session_id, explicitHost) : undefined;
    const websiteEnvOverride = input.website_env ?? (webConversation ? undefined : process.env.AE_CLI_WEBSITE_ENV);
    const selectedWebsiteEnv = websiteEnvironment(websiteEnvOverride ?? pinnedSession?.website_env, {});
    const testHost = selectedWebsiteEnv === 'test' ? `https://${OVERSEAS_TEST_PRODUCT_HOSTNAME}` : undefined;
    if (testHost && explicitHost && explicitHost !== testHost) throw new Error('Use the overseas test product host for test website onboarding.');
    let session = pinnedSession ?? this.store.session(undefined, explicitHost ?? testHost);
    let host = explicitHost ?? session?.host ?? testHost;
    if (!host) {
      const active = this.dependencies.activeHost();
      const activeCandidate = active ? trustedProductHost(active) : undefined;
      // An unauthenticated default/old active host is not an account binding for new registration.
      host = activeCandidate && (action === 'plan' || this.dependencies.authenticated(activeCandidate)) ? activeCandidate : undefined;
    }
    if (!session) session = this.store.session(undefined, host);
    if (session) {
      const origin = session.bootstrap?.origin;
      const matchesOrigin = !origin || (testHost ? origin === OVERSEAS_TEST_WEBSITE_ORIGIN : isProductionWebsiteOrigin(origin));
      if ((session.website_env ?? 'production') !== selectedWebsiteEnv || (testHost && session.host !== testHost) || !matchesOrigin) {
        if (pinnedSession) throw new Error('This onboarding session is bound to a previous website environment. Start a separate continuation.');
        session = undefined;
      }
    }
    const source = cliEntrySource(input.source ?? session?.source);
    const inspectLocalLanguage = !webConversation && !testHost && (action === 'plan' || (action === 'run' && !host && !session));
    const localLanguage = inspectLocalLanguage ? localRegistrationLanguage() : undefined;
    const requestedLanguage = registrationLanguage(input.language ?? session?.language ?? localLanguage);
    const markets = testHost ? OVERSEAS_TEST_MARKETS : WEBSITE_MARKETS;
    const languageMarket = registrationMarket(requestedLanguage);
    const inferredMarket = testHost && languageMarket === 'cn' ? 'us' : languageMarket;
    const unboundMarket = testHost || !host ? inferredMarket : undefined;
    const selectedMarket = input.region ?? session?.region;
    const us = isUsOnboarding(host, this.dependencies.webMarket ?? selectedMarket ?? unboundMarket);
    const language = us ? US_ONBOARDING_LANGUAGE : requestedLanguage;
    const defaultMarket = us ? 'us' : inferredMarket;
    const useDefaultMarket = Boolean(unboundMarket) || (us && !webConversation);
    const languageSource = us || input.language ? 'explicit' : 'system';
    const registrationOrigin = webConversation ? null : websiteOrigin(input.region ?? session?.region ?? defaultMarket, selectedWebsiteEnv);
    if (action === 'plan') return { dry_run: true, host: host ?? null, market: input.region ?? session?.region ?? (useDefaultMarket ? defaultMarket : null),
      language, default_market: defaultMarket,
      ...(localLanguage ? { local_language: localLanguage } : {}),
      ...(!webConversation && !testHost && !explicitHost && !input.region && !input.session_id
        ? { existing_account_options: existingAccountOptions(localLanguage) } : {}),
      device_market: testHost ? 'us' : onboardingDeviceMarket(webConversation ? registrationLanguage() : localLanguage), markets,
      selection_source: input.region ? 'explicit' : session?.region_source ?? (session?.region ? 'saved' : useDefaultMarket ? 'language_default' : 'existing_host'),
      website_env: selectedWebsiteEnv, website_origin: registrationOrigin,
      actions: webConversation ? ['read_project_state', 'choose_demo', 'prepare_demo']
        : ['resolve_trusted_host', 'resolve_account_host', 'authorize_cli', 'read_project_state', 'choose_demo_or_business', 'prepare_demo_or_connect_sdk'],
      browser_mode: browserMode,
      capabilities: [DEMO_CONTEXT, DEMO_ENSURE, DEMO_STATUS], requires_node: '>=20' };
    if (!session && action === 'status' && (!host || !this.dependencies.authenticated(host))) return { host: host ?? null, project_id: null, phase: 'not_started', next_action: 'run_onboarding', poll_after_ms: 0 };
    const newSession = (market?: string): LocalSession => ({ schema_version: 1, id: crypto.randomUUID(), host,
      browser: browserMode,
      source, region: market ?? (useDefaultMarket ? defaultMarket : undefined), language, language_source: languageSource, website_env: selectedWebsiteEnv,
      region_source: market ? 'explicit' : useDefaultMarket ? 'language_default' : undefined,
      ...(testHost ? { requires_auth: true } : {}),
      updated_at: new Date(this.dependencies.now()).toISOString() });
    if (!session) session = newSession(input.region);
    const credentialKey = host && this.dependencies.authenticated(host) ? this.dependencies.credentialKey(host) : undefined;
    if (credentialKey && session.credential_key && credentialKey !== session.credential_key) {
      clearAccountScope(session);
    }
    if (credentialKey) session.credential_key = credentialKey;
    session.host ??= host;
    if (!session.region) {
      session.region = input.region ?? (useDefaultMarket && action === 'run' ? defaultMarket : undefined);
      if (session.region) session.region_source = input.region ? 'explicit' : 'language_default';
    }
    session.language = language;
    if (languageSource === 'explicit') session.language_source = languageSource;
    session.source = source;
    session.website_env ??= selectedWebsiteEnv;
    session.browser = browserMode;
    let current = session;
    const startedAt = this.dependencies.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RUN_BUDGET_MS);
    timer.unref();
    const network = async <T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> => {
      const child = new AbortController();
      const abort = () => child.abort();
      controller.signal.addEventListener('abort', abort, { once: true });
      if (controller.signal.aborted) child.abort();
      const requestTimer = setTimeout(abort, NETWORK_BUDGET_MS);
      requestTimer.unref();
      try { child.signal.throwIfAborted(); const value = await operation(child.signal); child.signal.throwIfAborted(); return value; }
      finally { clearTimeout(requestTimer); controller.signal.removeEventListener('abort', abort); }
    };
    let browserOpening: { url: string; receipt: OnboardingBrowserReceipt } | undefined;
    const summary = (extra: Record<string, unknown>) => {
      const target: { name: OnboardingBrowserTarget; url: string } | undefined = typeof extra.verification_url === 'string'
        ? { name: 'device_authorization', url: extra.verification_url }
        : typeof extra.login_url === 'string' ? { name: 'website_login', url: extra.login_url } : undefined;
      const opening = target && browserOpening?.url === target.url ? browserOpening : undefined;
      const interaction = typeof extra.next_action === 'string'
        ? onboardingInteraction(extra.next_action, webConversation) : undefined;
      return { language: current.language ?? language, market: current.region ?? null, default_market: defaultMarket,
        website_env: current.website_env,
        markets, selection_source: current.region_source ?? (current.region ? 'saved' : 'existing_host'),
        ...extra, skill_path: path.join(getLocalCliPackageInfo().root, 'skills', 'ae-onboarding', 'SKILL.md'),
        ...(interaction ? { interaction } : {}),
        ...(target ? { browser: opening?.receipt ?? extra.browser ?? onboardingBrowserPolicy({ target: target.name, new_page: false }) } : {}),
        session_id: current.id, host: current.host ?? null, project_id: current.project_id ?? null };
    };
    const open = (url: string, target: OnboardingBrowserTarget) => {
      controller.signal.throwIfAborted();
      // The existing OS opener has a five-second synchronous bound. Keep that time in the invocation budget.
      const receipt = onboardingBrowserPolicy({ target, new_page: true,
        system_open_allowed: this.dependencies.now() - startedAt + 5000 < RUN_BUDGET_MS,
        open_system: () => this.dependencies.open(url) });
      browserOpening = { url, receipt };
      return receipt.open_command_succeeded === true;
    };
    try {
      const execute = async (): Promise<Record<string, unknown>> => {
        const marketChanged = input.region && current.region && input.region !== current.region;
        if (marketChanged) {
          if (action !== 'run' || input.session_id || (current.host && !(testHost && current.requires_auth))
              || current.project_id || current.credential_key || current.device) {
            throw new Error('The continuation is bound to another market. Keep the existing account environment and resume its original continuation.');
          }
          if (current.bootstrap) {
            const previous = await network(signal => this.dependencies.readBootstrap(current.bootstrap!.origin, current.bootstrap!.intent_id, current.bootstrap!.poll_token, signal, current.source, current.region));
            if (previous.host || !['pending', 'expired'].includes(previous.status)) {
              return summary({ phase: 'action_required', next_action: 'resume_existing_registration', code: 'REGISTRATION_MARKET_BOUND',
                login_url: previous.ready_url ?? current.bootstrap.login_url, poll_after_ms: 0 });
            }
          }
          // Start a separate pending registration; never overwrite the original intent or account.
          const previousRegionSource = current.region_source;
          current = newSession(input.region ?? current.region);
          if (!input.region) current.region_source = previousRegionSource;
          return this.store.locked(`session:${current.id}`, execute);
        }
        if (action === 'run') {
          this.store.save(current);
        }
        let completedLogin: Record<string, unknown> = {};
        let loginChangedCredential = false;
        if (current.requires_auth || !current.host || !this.dependencies.authenticated(current.host)) {
          if (!this.dependencies.machineLoginAllowed(current.host)) return summary({ phase: 'action_required', next_action: 'replace_external_cli_token', code: 'EXTERNAL_CLI_TOKEN_ACTIVE', poll_after_ms: 0 });
          const result = await this.authentication(action, current, summary, network, open);
          if (action !== 'run' || result.phase !== 'pending' || result.next_action !== 'run_onboarding'
              || result.poll_after_ms !== 0 || !current.host || !this.dependencies.authenticated(current.host)) return result;
          const signedIn = this.dependencies.credentialKey(current.host);
          if (!signedIn) return result;
          if (result.login_mode === 'website_login' && result.authorization_status === 'claimed') {
            completedLogin = { login_mode: result.login_mode, authorization_status: result.authorization_status };
          }
          if (current.credential_key && current.credential_key !== signedIn) {
            clearAccountScope(current);
            loginChangedCredential = true;
          }
          current.credential_key = signedIn;
          this.store.save(current);
        }
        const compatibility = action === 'run' ? await network(signal => this.dependencies.compatibility(current.host!, signal)) : undefined;
        const versioned = webConversation || isOnboardingProgressHost(current.host);
        let progress = versioned && action === 'run' ? await readProgress(this.dependencies, current.host!) : undefined;
        if (progress?.state === 'not_started' && input.choice === 'demo' && !loginChangedCredential) {
          progress = await writeProgress(this.dependencies, current.host!, 'start', { version: progress.version });
        }
        if (progress?.state === 'in_progress' && progress.journey_id !== current.journey_id) {
          current = { ...current, id: crypto.randomUUID(), journey_id: progress.journey_id,
            choice: undefined, sample_id: undefined, ready_demo: undefined, demo_visits: undefined };
          this.store.save(current);
        } else if (progress?.state === 'not_started' && !input.choice && (current.choice || current.journey_id)) {
          current = { ...current, id: crypto.randomUUID(), journey_id: undefined, choice: undefined, sample_id: undefined, ready_demo: undefined, demo_visits: undefined };
        }
        const context = await network(signal => this.dependencies.capability(current.host!, DEMO_CONTEXT, {}, signal));
        const projectId = context?.business_project?.project_id;
        const availableProject = Number.isSafeInteger(projectId) && projectId > 0;
        if (action === 'run' && !loginChangedCredential && input.confirm_business_project_id !== undefined) {
          if (!availableProject || input.confirm_business_project_id !== projectId) throw new Error('Confirm the eligible business project shown by AE.');
          current.confirmed_business_project_id = projectId;
        }
        const boundProject = availableProject && (!context.requires_confirmation || current.confirmed_business_project_id === projectId);
        if (boundProject) current.project_id = projectId;
        else delete current.project_id;
        if (action === 'run') {
          if (!loginChangedCredential) {
            if (input.choice === 'demo' || input.sample) current.choice = 'demo';
            else if (input.choice === 'business') current.choice = 'business';
            else if (webConversation && current.choice === 'business') delete current.choice;
            if (current.choice === 'demo') current.sample_id = input.sample ?? current.sample_id ?? context.recommended_sample;
          }
          if (current.choice !== 'demo' || current.ready_demo?.sample_id !== current.sample_id
              || current.ready_demo?.project_id === projectId) delete current.ready_demo;
          this.store.save(current);
        }
        const account = {
          ...completedLogin,
          ...(progress ? { onboarding_progress: { state: progress.state, run_id: progress.run_id,
            experiment_id: progress.experiment_id, demo_project_id: progress.demo_project_id } } : {}),
          business_project: availableProject ? context.business_project : null, compatibility,
          ...(!webConversation ? { business_data: {
            interaction: onboardingInteraction('choose_data_source'),
            tools: onboardingInteraction('choose_data_tool'),
          } } : {}),
        };
        if (current.choice === 'demo' && current.sample_id) {
          const prepareDemo = () => network(signal => this.dependencies.capability(current.host!, action === 'run' ? DEMO_ENSURE : DEMO_STATUS,
            { sample_id: current.sample_id }, signal));
          let demo = await prepareDemo();
          if (action === 'run' && demo?.status === 'initialized') {
            // Initialization does not send events. Advance it and check ingestion before returning a poll delay.
            try {
              demo = await prepareDemo();
              if (demo?.status === 'uploaded') demo = await prepareDemo();
            } catch (error: any) {
              if (!controller.signal.aborted && error?.name !== 'AbortError' && error?.name !== 'TimeoutError') throw error;
            }
          }
          if (action === 'run') {
            const scope = readyDemoScope(demo, current);
            if (scope) {
              const sample = DEMO_SAMPLE_IDS.find(id => id === scope.sample_id);
              if (sample && (!current.ready_demo || input.sample)) {
                current.demo_visits ??= {};
                current.demo_visits[sample] = (current.demo_visits[sample] ?? 0) + 1;
              }
              current.ready_demo = scope;
            }
            else delete current.ready_demo;
            this.store.save(current);
          }
          if (action === 'run' && progress?.state === 'in_progress' && current.ready_demo) {
            try {
              await writeProgress(this.dependencies, current.host!, 'check_demo', {
                demo_project_id: current.ready_demo.project_id,
              });
            } catch (error: any) {
              if (error?.code !== 'PLG_DEMO_LICENSE_REQUIRED') throw error;
              return summary({ ...account, demo, demo_project_id: current.ready_demo.project_id,
                phase: 'action_required', next_action: 'check_demo_license', code: error.code,
                message: error.message, poll_after_ms: 0 });
            }
          }
          const sample = DEMO_SAMPLE_IDS.find(id => id === current.sample_id);
          return summary({ ...account, demo, samples: context.samples, demo_project_id: demo?.project_id ?? null,
            ...(demo?.status === 'ready' && sample ? { demo_overview: onboardingDemoOverview(sample, current.demo_visits?.[sample] ?? 1) } : {}),
            evidence: onboardingEvidenceLinks(demo?.evidence, demo?.project_id, webConversation ? undefined : current.host),
            phase: demo?.status === 'ready' ? 'ready' : demo?.status === 'action_required' ? 'action_required' : 'pending',
            next_action: demo?.status === 'ready' ? 'offer_growth_questions' : demo?.status === 'action_required' ? 'inspect_demo_preparation' : 'poll_demo',
            poll_after_ms: demo?.status === 'ready' || demo?.status === 'action_required' ? 0 : 2000 });
        }
        if (!webConversation && current.choice === 'business') {
          if (!boundProject) return summary({ ...account, phase: 'waiting_user',
            next_action: availableProject ? 'confirm_business_project' : 'resolve_business_project', poll_after_ms: 0 });
          const completed = action === 'run' && input.sdk_complete;
          return summary({ ...account, phase: completed ? 'completed' : 'waiting_user',
            next_action: completed ? 'show_realtime_data' : 'identify_workspace_projects', poll_after_ms: 0,
            realtime_data_url: `${current.host}/#/data/realtime?setupProjectId=${projectId}`,
            ...(action === 'run' && !completed ? { workspace_projects: identifyWorkspaceProjects() } : {}) });
        }
        const choices = [{ value: 'demo', label: 'Start the demo' }];
        if (!webConversation) choices.push({ value: 'business', label: 'Connect my business data' });
        return summary({ ...account, phase: 'waiting_user', next_action: 'choose_experience', poll_after_ms: 0,
          choices, ...(!webConversation ? { demo_entry: onboardingInteraction('demo_entry') } : {}) });
      };
      return action === 'run' ? await this.store.locked(`session:${current.id}`, execute) : await execute();
    } catch (error: any) {
      if (controller.signal.aborted || error?.name === 'AbortError' || error?.name === 'TimeoutError') {
        return summary({ phase: 'pending', next_action: 'retry_onboarding', poll_after_ms: 1000 });
      }
      if (action === 'run' && (error?.httpStatus === 401 || error?.name === 'SecureStoreAuthError')) {
        if (this.dependencies.webConversation) {
          return summary({ phase: 'action_required', next_action: 'retry_web_onboarding', code: 'PLATFORM_CREDENTIAL_UNAVAILABLE', poll_after_ms: 0 });
        }
        current.requires_auth = true;
        this.store.save(current);
        return summary({ phase: 'waiting_user', next_action: 'reauthorize_cli', poll_after_ms: 0 });
      }
      throw error;
    } finally { clearTimeout(timer); }
  }

  private async authentication(action: 'run' | 'status', session: LocalSession,
    summary: (extra: Record<string, unknown>) => Record<string, unknown>,
    network: <T>(operation: (signal: AbortSignal) => Promise<T>) => Promise<T>, open: (url: string, target: OnboardingBrowserTarget) => boolean): Promise<Record<string, unknown>> {
    if (session.device) {
      const route = resolveDeviceSessionRoute(session.host!, session.device.device_code);
      if (session.device.host !== session.host || session.device.base_url !== route.baseUrl) {
        if (action === 'status') return summary({ phase: 'action_required', next_action: 'run_onboarding', login_recovery_url: session.bootstrap?.login_url, poll_after_ms: 0 });
        // Expire only an obsolete local short authorization; preserve the account, website intent and project assets.
        delete session.device;
        this.store.save(session);
      }
    }
    if (session.device) {
      const device = session.device;
      const waitForDevice = (pollAfterMs: number) => {
        let verificationUrl = device.verification_url;
        if (isUsOnboarding(session.host, session.region)) {
          const target = new URL(verificationUrl);
          target.searchParams.set('locale', US_ONBOARDING_LANGUAGE);
          verificationUrl = target.href;
          if (action === 'run' && verificationUrl !== device.verification_url) {
            device.verification_url = verificationUrl;
            this.store.save(session);
            open(verificationUrl, 'device_authorization');
          }
        }
        return summary({ phase: 'waiting_user', next_action: 'approve_device', verification_url: verificationUrl,
          login_recovery_url: session.bootstrap?.login_url, poll_after_ms: pollAfterMs });
      };
      if (action === 'status' && Date.parse(device.expires_at) <= this.dependencies.now()) return summary({ phase: 'waiting_user', next_action: 'reauthorize_cli', login_recovery_url: session.bootstrap?.login_url, poll_after_ms: 0 });
      if (action === 'status') return waitForDevice(device.interval_ms);
      if (Date.parse(device.expires_at) <= this.dependencies.now()) { delete session.device; this.store.save(session); }
      else {
        if (device.host !== session.host) throw new Error('The device session belongs to another host.');
        if (this.dependencies.now() < device.next_poll_at) return waitForDevice(device.next_poll_at - this.dependencies.now());
        const result = await network(signal => this.dependencies.poll(device.base_url, device.device_code, signal));
        if (result.status === 'approved') {
          await network(signal => this.dependencies.persist(session.host!, result.tokens, signal));
          delete session.device; delete session.bootstrap; delete session.requires_auth;
          delete session.project_id;
          this.store.save(session);
          return summary({ phase: 'pending', next_action: 'run_onboarding', poll_after_ms: 0 });
        }
        if (result.status === 'expired') { delete session.device; this.store.save(session); return summary({ phase: 'waiting_user', next_action: 'reauthorize_cli', login_recovery_url: session.bootstrap?.login_url, poll_after_ms: 0 }); }
        if (result.status === 'denied' || result.status === 'unsupported') return summary({ phase: 'action_required', next_action: 'review_cli_authorization', code: result.status === 'denied' ? result.code : 'DEVICE_AUTH_UNSUPPORTED', poll_after_ms: 0 });
        if (result.status === 'slow_down') device.interval_ms += 5000;
        device.next_poll_at = this.dependencies.now() + device.interval_ms;
        this.store.save(session);
        return waitForDevice(device.interval_ms);
      }
    }
    if (action === 'status') {
      if (session.bootstrap && Date.parse(session.bootstrap.expires_at) > this.dependencies.now()) {
        const ready = await network(signal => this.dependencies.readBootstrap(session.bootstrap!.origin, session.bootstrap!.intent_id, session.bootstrap!.poll_token, signal, session.source, session.region));
        const host = readyAccountHost(ready, session.host);
        return summary({ phase: 'waiting_user', bootstrap_status: ready.status,
          next_action: host ? 'run_onboarding' : 'complete_website_login',
          login_url: ready.ready_url ?? session.bootstrap.login_url, login_mode: ready.login_mode,
          authorization_status: ready.authorization_status, poll_after_ms: ready.poll_after_ms });
      }
      return summary({ phase: 'waiting_user', next_action: 'run_onboarding', poll_after_ms: 0 });
    }
    if (!session.region) return summary({ phase: 'action_required', next_action: 'choose_market', poll_after_ms: 0 });
    const language = session.language_source === 'explicit' ? registrationLanguage(session.language) : undefined;
    if (!session.bootstrap || Date.parse(session.bootstrap.expires_at) <= this.dependencies.now()) {
      const thread = session.source === 'codex' && UUID_PATTERN.test(process.env.CODEX_THREAD_ID ?? '') ? process.env.CODEX_THREAD_ID : undefined;
      const created = await network(signal => this.dependencies.createBootstrap(session.region!, session.source ?? 'other', session.host, signal, thread, session.website_env, language));
      session.bootstrap = { origin: bootstrapOrigin(session.region, session.website_env), intent_id: created.intent_id, poll_token: created.poll_token, login_url: created.login_url, expires_at: created.expires_at,
        ...(created.login_mode ? { login_mode: created.login_mode } : {}) };
      delete session.website_device;
      this.store.save(session);
      open(created.login_url, 'website_login');
      return summary({ phase: 'waiting_user', next_action: 'complete_website_login', login_url: created.login_url,
        login_mode: created.login_mode, poll_after_ms: created.poll_after_ms });
    }
    const ready = await network(signal => this.dependencies.readBootstrap(session.bootstrap!.origin, session.bootstrap!.intent_id, session.bootstrap!.poll_token, signal, session.source, session.region));
    if (ready.status === 'expired') { delete session.bootstrap; delete session.website_device; this.store.save(session); return summary({ phase: 'waiting_user', next_action: 'restart_website_login', poll_after_ms: 0 }); }
    if (ready.authorization_status) { session.bootstrap.authorization_status = ready.authorization_status; this.store.save(session); }
    const host = readyAccountHost(ready, session.host);
    if (!host) return summary({ phase: 'waiting_user', next_action: 'complete_website_login',
      login_url: ready.ready_url ?? session.bootstrap.login_url, login_mode: ready.login_mode ?? session.bootstrap.login_mode,
      authorization_status: ready.authorization_status, poll_after_ms: ready.poll_after_ms });
    session.host = host;
    const mode = ready.login_mode ?? (session.bootstrap.login_mode === 'website_login' ? undefined : 'device_confirmation');
    if (!mode) return summary({ phase: 'waiting_user', next_action: 'complete_website_login', login_mode: 'website_login',
      login_url: ready.ready_url ?? session.bootstrap.login_url, poll_after_ms: ready.poll_after_ms });
    if (session.bootstrap.effective_login_mode && session.bootstrap.effective_login_mode !== mode) throw new Error('The website login mode changed. Start a separate connection.');
    session.bootstrap.effective_login_mode = mode;
    if (mode === 'website_login') {
      if (session.bootstrap.login_mode !== 'website_login') throw new Error('This continuation did not negotiate website login.');
      session.requires_auth = true;
      this.store.save(session);
      return this.websiteAuthentication(session, ready, summary, network);
    }
    const device = await network(signal => this.dependencies.authorize(session.host!, signal));
    const auth = device.authorization;
    session.device = { host: session.host, base_url: device.baseUrl, device_code: auth.device_code,
      verification_url: agentVerificationUrl(device.baseUrl, auth, language), expires_at: new Date(this.dependencies.now() + (auth.expires_in ?? 300) * 1000).toISOString(),
      interval_ms: Math.max(1000, (auth.interval ?? 5) * 1000), next_poll_at: this.dependencies.now() + Math.max(1000, (auth.interval ?? 5) * 1000) };
    this.store.save(session);
    open(session.device.verification_url, 'device_authorization');
    return summary({ phase: 'waiting_user', next_action: 'approve_device', verification_url: session.device.verification_url, login_recovery_url: session.bootstrap?.login_url, poll_after_ms: session.device.interval_ms });
  }

  private async websiteAuthentication(session: LocalSession, ready: BootstrapState,
    summary: (extra: Record<string, unknown>) => Record<string, unknown>,
    network: <T>(operation: (signal: AbortSignal) => Promise<T>) => Promise<T>): Promise<Record<string, unknown>> {
    const bootstrap = session.bootstrap!;
    const issuer = trustedProductHost(session.host!);
    const waiting = (status: string, delay = ready.poll_after_ms) => summary({ phase: 'waiting_user', next_action: 'complete_website_login',
      login_mode: 'website_login', authorization_status: status, login_url: ready.ready_url ?? bootstrap.login_url, poll_after_ms: delay });
    const restart = (code: string) => {
      delete session.bootstrap; delete session.website_device;
      this.store.save(session);
      return summary({ phase: 'action_required', next_action: 'restart_website_login', login_mode: 'website_login', code, poll_after_ms: 0 });
    };
    if (session.website_device && Date.parse(session.website_device.expires_at) <= this.dependencies.now()) {
      return restart('WEBSITE_AUTHORIZATION_EXPIRED');
    }
    if (session.website_device && session.website_device.next_poll_at > this.dependencies.now()) return waiting(ready.authorization_status ?? 'pending', session.website_device.next_poll_at - this.dependencies.now());
    const grant = await network(signal => this.dependencies.claimBootstrapDevice(bootstrap.origin, bootstrap.intent_id, bootstrap.poll_token, signal));
    if (grant.login_mode !== 'website_login') throw new Error('The website did not confirm this login mode.');
    if (grant.authorization_status === 'expired') return restart('WEBSITE_AUTHORIZATION_EXPIRED');
    if (grant.authorization_status !== 'approved' && grant.authorization_status !== 'claimed') return waiting(grant.authorization_status, grant.poll_after_ms ?? ready.poll_after_ms);
    if (grant.host !== issuer || !grant.device_code || !grant.expected_login_name || !grant.expected_company_id
      || !grant.expires_at || !Number.isFinite(Date.parse(grant.expires_at)) || Date.parse(grant.expires_at) <= this.dependencies.now()) throw new Error('The website device connection does not match this continuation.');
    const fingerprint = crypto.createHash('sha256').update(grant.device_code).digest('hex');
    const previous = session.website_device;
    if (previous && (previous.fingerprint !== fingerprint || previous.issuer !== issuer || previous.expires_at !== grant.expires_at
      || previous.expected_login_name !== grant.expected_login_name || previous.expected_company_id !== String(grant.expected_company_id))) {
      throw new Error('The website device connection changed. Start a separate connection.');
    }
    session.website_device = { fingerprint, issuer, expires_at: grant.expires_at, expected_login_name: grant.expected_login_name,
      expected_company_id: String(grant.expected_company_id), next_poll_at: this.dependencies.now(), interval_ms: previous?.interval_ms ?? Math.max(1000, (grant.interval ?? 5) * 1000) };
    this.store.save(session);
    const result = await network(signal => this.dependencies.poll(issuer, grant.device_code!, signal));
    if (result.status === 'approved') {
      await network(signal => this.dependencies.verifyWebsiteLoginIdentity(session.host!, result.tokens.access_token,
        { login_name: grant.expected_login_name!, company_id: String(grant.expected_company_id) }, signal));
      await network(signal => this.dependencies.persist(session.host!, result.tokens, signal));
      delete session.website_device; delete session.bootstrap; delete session.requires_auth;
      delete session.project_id;
      this.store.save(session);
      return summary({ phase: 'pending', next_action: 'run_onboarding', login_mode: 'website_login', authorization_status: 'claimed', poll_after_ms: 0 });
    }
    if (result.status === 'denied' || result.status === 'unsupported' || result.status === 'expired') return restart(
      result.status === 'denied' ? 'WEBSITE_AUTHORIZATION_DENIED' : result.status === 'expired' ? 'WEBSITE_AUTHORIZATION_EXPIRED' : 'DEVICE_AUTH_UNSUPPORTED');
    if (result.status === 'slow_down') session.website_device.interval_ms += 5000;
    session.website_device.next_poll_at = this.dependencies.now() + session.website_device.interval_ms;
    this.store.save(session);
    return waiting('approved', session.website_device.interval_ms);
  }
}
