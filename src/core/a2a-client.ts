import { clearCliTokenCache, getCliToken } from './cli-token.js';
import { CliValidationError } from './errors.js';
import { externalCliTokenRequestOptions } from './external-cli-token.js';
import { resolveTeClaudeBaseUrl } from './te-claude-base-url.js';
import { TeAgentApiError } from './te-agent-client.js';

/** Bind the supplied link to the selected host before loading any credentials. */
export function resolveA2aTarget(host: string, link: string): { card: string; rpc: string } {
  try {
    const base = new URL(resolveTeClaudeBaseUrl(host));
    const target = new URL(link);
    const prefix = `${base.pathname.replace(/\/+$/, '')}/api/a2a/agents/`;
    const defaultCard = `${base.pathname.replace(/\/+$/, '')}/.well-known/agent-card.json`;
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash
      || target.origin !== base.origin || target.username || target.password || target.search || target.hash
      || /\s/.test(link)) throw new Error();
    if (target.pathname === defaultCard) return { card: target.href, rpc: `${base.origin}${prefix}system-default-agent` };
    if (!target.pathname.startsWith(prefix)) throw new Error();
    const suffix = target.pathname.slice(prefix.length).replace(/\/agent-card\.json$/, '');
    const id = decodeURIComponent(suffix);
    if (!id || id.length > 191 || /[/\\\s?#\u0000-\u001f]/.test(id) || id === '.' || id === '..') throw new Error();
    const rpc = `${base.origin}${prefix}${encodeURIComponent(id)}`;
    return { card: `${rpc}/agent-card.json`, rpc };
  } catch {
    throw new CliValidationError('A2A URL must identify an AE Agent under the selected host application path, without credentials, query, or fragment.', {
      hint: 'Select the authorized AE deployment with --host <url>; use its /agent/.well-known/agent-card.json or /agent/api/a2a/agents/<id>/agent-card.json link. Log in to that host first.',
    });
  }
}

/** A2A uses Bearer CLI tokens, not the cli-token header used by resource APIs. */
export async function requestA2a(host: string, link: string, body?: Record<string, unknown>, extensions: readonly string[] = []): Promise<unknown> {
  const target = resolveA2aTarget(host, link);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const requestOnce = async (): Promise<Response> => {
      const token = await getCliToken(host, controller.signal);
      try {
        return await fetch(body ? target.rpc : target.card, {
          ...externalCliTokenRequestOptions(body ? target.rpc : target.card),
          method: body ? 'POST' : 'GET',
          headers: { Authorization: `Bearer ${token}`, 'A2A-Version': '1.0', Accept: 'application/json', ...(extensions.length ? { 'A2A-Extensions': extensions.join(',') } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}),
          redirect: 'error',
          signal: controller.signal,
        });
      } catch {
        throw new TeAgentApiError('A2A request failed or timed out; redirects are not allowed.', 0, 'A2A_NETWORK_ERROR');
      }
    };
    let response = await requestOnce();
    if (response.status === 401) {
      await response.body?.cancel();
      clearCliTokenCache(host);
      response = await requestOnce();
    }
    if (!response.ok) {
      const type = response.status === 401 ? 'auth' : response.status === 403 ? 'permission' : 'api';
      throw new TeAgentApiError(`A2A request returned HTTP ${response.status}.`, response.status, 'A2A_HTTP_ERROR', undefined, type,
        response.status === 401 ? 'Run ae-cli auth login --host <url> for the selected AE deployment.' : undefined);
    }
    let data: any;
    try { data = await response.json(); } catch {
      throw new TeAgentApiError('A2A response is not valid JSON.', response.status, 'A2A_INVALID_RESPONSE');
    }
    if (!body) return data;
    if (data?.jsonrpc !== '2.0' || data.id !== body.id || (!!data.error === Object.hasOwn(data, 'result'))) {
      throw new TeAgentApiError('A2A response is not a matching JSON-RPC response.', response.status, 'A2A_INVALID_RESPONSE');
    }
    if (data.error) {
      throw new TeAgentApiError('A2A operation failed.', response.status, String(data.error.code ?? 'A2A_RPC_ERROR'));
    }
    return data.result;
  } finally {
    clearTimeout(timer);
  }
}
