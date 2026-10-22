import { EvalApiError } from './eval-client.js';
import { resolveEvaluationHost } from './eval-endpoint.js';
import { externalCliTokenRequestOptions } from './external-cli-token.js';

const SESSION_PATH = '/api/sandbox/agent/evaluation/session';

export async function requestSandboxEvaluationSession(
  host: string,
  cliToken: string,
  teProjectId?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const url = `${resolveEvaluationHost(host)}/agent${SESSION_PATH}`;
  const credentialOptions = externalCliTokenRequestOptions(url);
  const signal = AbortSignal.timeout(30_000);
  let response: Response;
  let body: any;
  try {
    response = await fetchImpl(url, {
      ...credentialOptions,
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'cli-token': cliToken },
      body: JSON.stringify(teProjectId ? { te_project_id: teProjectId } : {}),
      redirect: 'error',
      signal,
    });
    try {
      body = await response.json();
    } catch (error) {
      if (signal.aborted) throw error;
      body = undefined;
    }
  } catch {
    throw new EvalApiError(signal.aborted
      ? 'Evaluation session request timed out.'
      : 'Evaluation session request failed; redirects are not allowed.', {
      code: signal.aborted ? 'EVAL_SANDBOX_SESSION_TIMEOUT' : 'EVAL_SANDBOX_SESSION_NETWORK_ERROR',
      httpStatus: 0,
      hint: 'Verify that the AE Host serves the session endpoint directly without redirects.',
    });
  }
  if (!response.ok || typeof body?.session_token !== 'string' || !body.session_token) {
    throw new EvalApiError(
      typeof body?.error === 'string' ? body.error : 'Unable to obtain an evaluation session from the sandbox gateway.',
      {
        code: 'EVAL_SANDBOX_SESSION_FAILED',
        httpStatus: response.status,
        sensitiveValues: [cliToken, typeof body?.session_token === 'string' ? body.session_token : ''],
        hint: response.status === 400
          ? 'Set AE_EVAL_TE_PROJECT_ID when the CLI token is authorized for multiple TE projects.'
          : 'Verify that the sandbox gateway and Agent Evaluation service are configured.',
      },
    );
  }
  return body.session_token;
}
