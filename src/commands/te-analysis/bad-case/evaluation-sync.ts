import { executeCapability } from '../../../core/capability-api.js';
import { EvalApiError } from '../../../core/eval-client.js';
import { evalApi } from '../../evaluation/shared.js';
import type { RuntimeContext } from '../../../framework/types.js';

type Case = {
  id: string; version: string; review_state: string;
  evidence_snapshot: { question: string; answer: string };
  ai_summary: { reason: string };
  review?: { supplement?: string };
  evaluation?: { state: string; case_id?: string; error_code?: string };
};

/** The CLI orchestrates independent Common and AE calls; neither backend calls the other. */
export async function syncBadCaseEvaluation(ctx: RuntimeContext, projectId: number, value: unknown): Promise<unknown> {
  const item = value as Case;
  // Older Common versions have no sync contract. Preserve their existing review behavior.
  if (!item?.evaluation || !['PENDING', 'ERROR'].includes(item.evaluation.state)) return value;
  const common = (action: string, input: Record<string, unknown> = {}) =>
    executeCapability(ctx.host(), 'analysis', `analysis.bad_case.${action}`, { project_id: projectId, ...input });
  let report: Record<string, unknown>;
  try {
    const config = await common('evaluation_config');
    if (!config?.initialized || config.te_project_id !== String(projectId) || !config.dataset_id)
      throw new EvalApiError('Initialize this project evaluation configuration first.', { code: 'NOT_INITIALIZED', httpStatus: 0 });
    const version = Number(item.version);
    if (!Number.isSafeInteger(version) || version <= 0)
      throw new EvalApiError('Invalid source version.', { code: 'INVALID_RESPONSE', httpStatus: 0 });
    const active = item.review_state === 'APPROVED';
    const result = await evalApi(ctx, 'PUT',
      `/semantic-evaluation/datasets/${encodeURIComponent(config.dataset_id)}/cases/${encodeURIComponent(item.id)}`, undefined,
      { version, active, question: item.evidence_snapshot.question, answer: item.evidence_snapshot.answer,
        reason: item.ai_summary.reason, supplement: item.review?.supplement || '' }, { teProjectId: String(projectId) });
    if (result?.source_version !== version || typeof result.case_id !== 'string' ||
        (active ? !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(result.case_id) : result.case_id !== ''))
      throw new EvalApiError('Invalid synchronization response.', { code: 'INVALID_RESPONSE', httpStatus: 0 });
    report = { state: 'SYNCED', case_id: result.case_id };
  } catch (error) {
    const code = error instanceof EvalApiError ? error.code : '';
    report = { state: 'ERROR', error_code:
      ['NOT_INITIALIZED', 'INVALID_RESPONSE'].includes(code) ? code :
        error instanceof EvalApiError && error.httpStatus === 403 ? 'FORBIDDEN' :
          error instanceof EvalApiError && (error.httpStatus === 401 || code === 'EVAL_ACCESS_TOKEN_MISSING') ? 'UNAUTHORIZED' : 'AE_SYNC_FAILED' };
  }
  try {
    return await common('evaluation_result', { item_id: item.id, version: item.version, ...report });
  } catch {
    // A failed result write must never turn a committed review into a claimed review failure.
    try { return await common('get', { item_id: item.id }); }
    catch { return { ...item, evaluation: { state: 'PENDING' } }; }
  }
}
