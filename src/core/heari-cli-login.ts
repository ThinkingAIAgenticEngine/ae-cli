import { loadConfig, readSandboxCliTokenEntry } from './config.js';
import { readExternalCliToken } from './external-cli-token.js';
import { loadCliToken } from './secure-store.js';

const ticketPath = '/v1/ta/heari/agent/cli-ticket';

type LoginStage = 'cli-ticket' | 'agent/exchange';
const publicCodes = new Set([
  'AE_SSO_GRANT_REJECTED', 'AE_WORKSPACE_UNAVAILABLE', 'AE_SSO_UNAVAILABLE',
  'invalid_user', 'invalid_credentials', 'temporarily_unavailable',
]);

async function requestGrant(url: URL, options: RequestInit, stage: LoginStage) {
  const failed = (status?: number, serviceCode?: string) => {
    const detail = { stage, site: url.origin, http_status: status, service_code: serviceCode };
    const message = stage === 'cli-ticket' ? 'AE could not issue a HearI ticket' : 'AE issued a ticket; HearI exchange failed';
    return Object.assign(new Error(message + ' at ' + url.origin +
      (status ? ' (HTTP ' + status + (serviceCode ? ', ' + serviceCode : '') + ')' : ' (network error)')), { aeDiagnostic: detail });
  };
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw failed();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = body?.detail ?? body?.error;
    throw failed(response.status, publicCodes.has(code) ? code : undefined);
  }
  return response;
}

export async function exchangeHeariCredentials(signal?: AbortSignal, checkEndpoint?: (endpoint: string) => void) {
  // Read the host and token from the same source, even when several AE accounts exist.
  const session = readExternalCliToken() ?? readSandboxCliTokenEntry();
  if (!session && process.env.TE_AGENT_CLI_CONFIG_DIR !== undefined) {
    throw new Error('Current session credentials are unavailable.');
  }
  const host = session?.url ?? loadConfig().activeHost;
  if (!host) return undefined;
  const cliToken = session?.token ?? loadCliToken(host);
  if (!cliToken) return undefined;
  const origin = new URL(host);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password ||
      origin.search || origin.hash || !/^cli_[!-~]{1,8192}$/.test(cliToken)) {
    throw new Error('Invalid AE session.');
  }
  const timeout = AbortSignal.timeout(15_000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const options = { method: 'POST', redirect: 'error', cache: 'no-store', signal: requestSignal } as const;
  const response = await requestGrant(new URL(ticketPath, origin), {
    ...options, headers: { 'cli-token': cliToken },
  }, 'cli-ticket');
  const { ticket, execution_id, audience } = await response.json();
  const target = new URL(audience);
  if (target.protocol !== 'https:' || target.origin !== audience ||
      typeof ticket !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(ticket) ||
      typeof execution_id !== 'string' || !/^cli-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(execution_id)) {
    throw new Error('Invalid HearI registration on the current AE deployment.');
  }
  const endpoint = new URL('/mcp', target).href;
  checkEndpoint?.(endpoint);
  const exchange = await requestGrant(new URL('/api/auth/ae/agent/exchange', target), {
    ...options, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket, execution_id }),
  }, 'agent/exchange');
  const { access_token, expires_in } = await exchange.json();
  if (typeof access_token !== 'string' || !/^[!-~]{1,4096}$/.test(access_token) ||
      !Number.isInteger(expires_in) || expires_in < 1 || expires_in > 300) {
    throw new Error('Invalid HearI credential response.');
  }
  return { endpoint, token: access_token };
}
