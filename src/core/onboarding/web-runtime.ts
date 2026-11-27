import { createHash } from 'node:crypto';
import path from 'node:path';
import { executeCapability } from '../capability-api.js';
import { getCliToken, validateCliTokenOnServer } from '../cli-token.js';
import { getActiveHost } from '../config.js';
import { externalCliTokenRequestOptions, readExternalCliToken } from '../external-cli-token.js';
import { registrationLanguage, registrationMarket } from '../host-guidance.js';
import { isAeSandboxRuntime } from '../sandbox-runtime.js';
import { fetchSigned } from '../te-agent-client.js';
import { isWebsiteMarket } from '../website-entry.js';
import { NETWORK_BUDGET_MS, isUsOnboarding, onboardingDemoCurrency, type OnboardingAction, type OnboardingInput } from './contracts.js';
import { OnboardingRuntime } from './runtime.js';
import { OnboardingStore } from './session-store.js';

const GUIDE_AGENT_ID = 'system-agent-onboarding-guide';
// Local state needs a stable host; task channels rotate their loopback port each turn.
const SESSION_HOST = 'https://onboarding-sandbox.invalid';

export function webSessionDirectory(env: NodeJS.ProcessEnv, cwd: string): string {
  const conversationId = env.TE_AGENT_CONVERSATION_ID;
  if (!conversationId || !/^[\w-]+$/.test(conversationId) || path.basename(cwd) !== conversationId) {
    throw new Error('Web onboarding must run in the current AE conversation directory.');
  }
  return path.join(cwd, '.ae-onboarding', 'cli');
}

async function readTaskActor(host: string, token: string, conversationId: string, signal: AbortSignal) {
  const legacy = token.startsWith('cli_task_');
  const url = new URL('/v1/ta/cli/config', host);
  const response = legacy
    ? await fetch(url, {
        headers: { Accept: 'application/json', 'cli-token': token },
        ...externalCliTokenRequestOptions(url.toString()), signal,
      })
    : await fetchSigned({ method: 'GET', path: '/api/sandbox/onboarding/context', hostOverride: host,
        authMode: 'cli-token', timeoutMs: NETWORK_BUDGET_MS });
  if (!response.ok) return undefined;
  type Actor = { account_id?: string; company_id?: string; conversation_id?: string; platform_region?: unknown; market?: unknown };
  const payload = await response.json() as { actor?: Actor; return_code?: number; data?: {
    task_cli_compat_enabled?: boolean; plg_onboarding_actor?: Actor;
  } };
  if (legacy && (payload.return_code !== 0 || payload.data?.task_cli_compat_enabled !== true)) return undefined;
  const actor = legacy ? payload.data?.plg_onboarding_actor : payload.actor;
  if (typeof actor?.account_id === 'string' && actor.account_id
      && typeof actor.company_id === 'string' && actor.company_id && actor.conversation_id === conversationId) {
    return {
      openId: actor.account_id,
      issuer: actor.company_id,
      platformRegion: actor.platform_region === 'cn' || actor.platform_region === 'overseas' ? actor.platform_region : undefined,
      market: typeof actor.market === 'string' && isWebsiteMarket(actor.market) ? actor.market : undefined,
    };
  }
}

export async function invokeOnboarding(action: OnboardingAction, input: OnboardingInput) {
  if (process.env.TE_AGENT_CURRENT_AGENT_ID !== GUIDE_AGENT_ID
      || (!isAeSandboxRuntime() && !process.env.TE_AGENT_CLI_CONFIG_DIR && !process.env.AE_CLI_TOKEN?.startsWith('cli_task_'))) {
    return new OnboardingRuntime().invoke(action, input);
  }
  if (input.host || input.region || input.website_env) throw new Error('Web onboarding uses the current AE account and environment.');
  if (input.choice === 'business' || input.confirm_business_project_id !== undefined || input.sdk_complete) {
    throw new Error('Business SDK setup requires a local agent. Web onboarding supports the Demo.');
  }
  const directory = webSessionDirectory(process.env, process.cwd());
  const external = readExternalCliToken();
  const host = external?.url ?? getActiveHost();
  if (!host || (!external && !process.env.TE_AGENT_CLI_CONFIG_DIR)) {
    throw new Error('AE did not provide credentials for the current onboarding conversation.');
  }
  const signal = AbortSignal.timeout(NETWORK_BUDGET_MS);
  const token = external?.token ?? await getCliToken(host, signal);
  if (external && !token.startsWith('cli_task_') && !external.taskContext) {
    throw new Error('Web onboarding requires the current AE task context.');
  }
  const actor = token.startsWith('cli_task_') || external?.taskContext
    ? await readTaskActor(host, token, process.env.TE_AGENT_CONVERSATION_ID!, signal)
    : { openId: (await validateCliTokenOnServer(host, token, signal)).account?.openId, issuer: host,
        platformRegion: undefined, market: undefined };
  if (!actor?.openId || (external?.taskContext && actor.issuer !== external.taskContext.companyId)) {
    throw new Error('AE could not verify the current onboarding account.');
  }
  const key = createHash('sha256').update(JSON.stringify([actor.issuer, actor.openId])).digest('hex');
  const store = new OnboardingStore(directory);
  const session = store.session(input.session_id, SESSION_HOST);
  if (session?.credential_key && session.credential_key !== key) {
    throw new Error('The current AE account does not match the onboarding session.');
  }
  const languageMarket = registrationMarket(registrationLanguage(input.language ?? session?.language));
  const overseasMarket = languageMarket === 'cn' ? 'us' : languageMarket;
  const market = actor.market ?? (actor.platformRegion === 'overseas' ? overseasMarket : actor.platformRegion)
    ?? (isUsOnboarding(host) ? 'us' : undefined);
  const runtime = new OnboardingRuntime(store, {
    webConversation: true,
    webMarket: market,
    demoCurrency: () => market === 'us' ? 'USD' : onboardingDemoCurrency(host),
    activeHost: () => SESSION_HOST,
    authenticated: scope => scope === SESSION_HOST,
    credentialKey: scope => scope === SESSION_HOST ? key : undefined,
    machineLoginAllowed: () => false,
    compatibility: async () => undefined,
    approverOpenId: async () => actor.openId,
    open: () => false,
    capability(scope, id, params, requestSignal) {
      if (scope !== SESSION_HOST) throw new Error('The continuation does not belong to this AE conversation.');
      return executeCapability(host, id.startsWith('experiment.') ? 'engage' : 'analysis', id, params, { signal: requestSignal });
    },
  });
  const output = await runtime.invoke(action, input);
  if (output.host === SESSION_HOST) output.host = null;
  if (typeof output.language === 'string') output.product_resource_market = market ?? null;
  return output;
}
