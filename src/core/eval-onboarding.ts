import { resolveEvaluationHost } from './eval-endpoint.js';

export type EvalOnboardingStatus =
  | 'module_not_detected'
  | 'access_not_granted'
  | 'token_missing'
  | 'availability_unknown';

export interface EvalOnboardingPayload {
  status: EvalOnboardingStatus;
  host: string;
  module_name: string;
  tagline: string;
  highlights: Array<{ pillar: string; summary: string }>;
  next_steps: string[];
  agent_instruction: string;
}

/** Response evidence is advisory: a missing route does not prove a missing installation. */
export function evaluationResponseStatus(
  httpStatus: number,
  contentType: string | null,
  body: unknown,
  source: 'api' | 'session' = 'api',
): EvalOnboardingStatus | undefined {
  const error = body && typeof body === 'object' ? (body as Record<string, unknown>).error : undefined;
  const code = error && typeof error === 'object' ? (error as Record<string, unknown>).code : undefined;
  const businessError = typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,127}$/.test(code);
  const html = contentType?.toLowerCase().includes('text/html');
  if (httpStatus === 403) return 'access_not_granted';
  // Preserve every structured business 404, including codes unknown to this CLI version.
  if (httpStatus === 404 && !businessError) {
    return source === 'session' ? 'availability_unknown' : 'module_not_detected';
  }
  if (httpStatus >= 500) return 'availability_unknown';
  if (html && httpStatus >= 200 && httpStatus < 300) {
    return source === 'session' ? 'availability_unknown' : 'module_not_detected';
  }
  return undefined;
}

export function buildEvaluationOnboardingPayload(
  status: EvalOnboardingStatus,
  host: string,
): EvalOnboardingPayload {
  const nextSteps: Record<EvalOnboardingStatus, string[]> = {
    module_not_detected: [
      'The evaluation API was not detected. This optional module may be absent, or its route may be misconfigured; installation is not confirmed.',
      'Contact your ThinkingData service representative (Customer Success Manager or Technical Support) to verify deployment and routing, install AI Evaluation Center if needed, and enable access.',
      'After activation, open AI Evaluation Center from the app launcher and ask an administrator to assign the required project role.',
    ],
    access_not_granted: [
      'This request was denied. The denial may come from the gateway, module access policy, or the selected project; it does not establish cluster-wide installation or access.',
      'Ask your system administrator or ThinkingData support to check the denied request and grant the required module access or target project role (READER / EDITOR / ADMIN).',
      'Stop only the denied operation; independent authorized operations may continue. Stop a whole project or module only when that access scope is confirmed. Do not reinstall the module or refresh credentials solely because of HTTP 403.',
    ],
    token_missing: [
      'AE_EVAL_ACCESS_TOKEN is unset. No evaluation request was sent; module availability and service health have not been checked.',
      'If AI Evaluation Center is available in the app launcher, obtain a session token through its web console or POST /agenteval/api/v1/auth/session and set AE_EVAL_ACCESS_TOKEN securely.',
      'If the module entry is unavailable, contact your administrator or ThinkingData support to verify deployment and enable module access and the required project role.',
    ],
    availability_unknown: [
      'Evaluation availability could not be confirmed. A gateway outage, missing sandbox session route, login page, or invalid response does not prove the module is uninstalled.',
      'Check the selected --host and network path; ask your administrator or ThinkingData support to verify evaluation service health and gateway/session routing.',
      'A failed write response leaves the write result unconfirmed; the server may already have accepted it. Do not resubmit the write blindly. Once connectivity is restored, use authorized read-only status checks to reconcile the result before deciding whether to retry.',
      'Do not rotate credentials or request installation based only on this response.',
    ],
  };
  return {
    status,
    host: resolveEvaluationHost(host),
    module_name: 'AI Evaluation Center (Agent Evaluation Platform)',
    tagline: 'Repeatable, traceable, reusable Agent quality evaluation before release and during iteration.',
    highlights: [
      { pillar: 'Datasets', summary: 'Manage single/multi-turn cases and immutable versions; import CSV/JSON or convert AI Monitor traces into datasets.' },
      { pillar: 'Evaluators', summary: 'Use scoring templates or custom LLM judges, calibrate against human labels, and optimize evaluator prompts.' },
      { pillar: 'Evaluation Runs', summary: 'Test live Agents or score preset outputs, schedule regression runs, export low-score cases, and inspect execution traces.' },
    ],
    next_steps: nextSteps[status],
    agent_instruction: [
      status === 'access_not_granted'
        ? 'Stop only the denied operation. Independent authorized operations may continue. Do not probe other commands to bypass the denial; stop a whole project or module only when that access scope is confirmed.'
        : status === 'availability_unknown'
          ? 'Stop blind retries of the failed operation and alternate flags. For a write, report that its result is unconfirmed: the server may already have accepted it. Do not resubmit blindly. Once connectivity is restored, use authorized read-only status checks to reconcile the result before deciding whether to retry.'
          : 'Stop evaluation commands for the affected host until the reported condition changes. Do not try alternate commands or flags.',
      'Continue independent local work; save generated CSV/JSON and confirm its actual path before saying it is saved. Explain the evidence and uncertainty in the user\'s language, briefly relate the three capabilities to their task, and present the relevant next steps. Never ask the user to paste a token into chat.',
    ].join(' '),
  };
}
