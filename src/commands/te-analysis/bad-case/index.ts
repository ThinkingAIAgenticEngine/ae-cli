import { unwrapOutputData } from '../../../framework/output.js';
import { syncBadCaseEvaluation } from './evaluation-sync.js';
import { readFileSync } from 'node:fs';
import { CliValidationError } from '../../../core/errors.js';
import { createAnalysisCapabilityCommand } from '../capability-shared.js';
import type { Flag, RuntimeContext } from '../../../framework/types.js';

const project: Flag = { name: 'project-id', type: 'number', required: true, desc: 'Project owner or administrator access is required.' };
const request: Flag = { name: 'client-request-id', type: 'string', required: true, desc: 'Stable request ID; preserve on retries.' };
const item: Flag = { name: 'item-id', type: 'string', required: true, desc: 'Bad Case item ID as a decimal string.' };
const batch: Flag = { name: 'batch-id', type: 'string', required: true, desc: 'Discovery batch ID returned by begin.' };
const limit: Flag = { name: 'limit', type: 'number', desc: 'Page size, 1..100. Follow pagination until complete.' };

export function badCaseInput(action: string, flags: Flag[], ctx: RuntimeContext): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const flag of flags) {
    if (flag.name === 'input-file') continue;
    const value = ctx.str(flag.name);
    if (!value && !flag.required) continue;
    if (!value && flag.required) throw new CliValidationError(`${flag.name} is required.`);
    if (flag.type === 'number') {
      const number = Number(value);
      const minimum = flag.name === 'offset' ? 0 : 1;
      const maximum = flag.name === 'limit' ? 100 : 2147483647;
      if (!Number.isInteger(number) || number < minimum || number > maximum) throw new CliValidationError(`${flag.name} must be an integer between ${minimum} and ${maximum}.`);
      input[flag.name.replaceAll('-', '_')] = number;
    } else if (flag.type === 'boolean') {
      if (!['true', 'false'].includes(value)) throw new CliValidationError(`${flag.name} must be true or false.`);
      input[flag.name.replaceAll('-', '_')] = value === 'true';
    } else {
      if (['item-id', 'batch-id', 'after-id', 'version'].includes(flag.name)
          && (!/^\d+$/.test(value) || BigInt(value) > 9223372036854775807n)) throw new CliValidationError(`${flag.name} must be a nonnegative 64-bit integer string.`);
      input[flag.name.replaceAll('-', '_')] = value;
    }
  }
  if (action === 'review' && !['APPROVE', 'REJECT', 'REVOKE'].includes(String(input.decision))) throw new CliValidationError('decision must be APPROVE, REJECT or REVOKE.');
  if (action === 'run' && !['HEARTBEAT', 'FAILED'].includes(String(input.action))) throw new CliValidationError('action must be HEARTBEAT or FAILED.');
  if (action === 'submit') {
    let packet: unknown;
    try { packet = JSON.parse(readFileSync(ctx.str('input-file'), 'utf8')); }
    catch { throw new CliValidationError('input-file must be a readable JSON file.'); }
    if (!packet || typeof packet !== 'object' || Array.isArray(packet)
        || Object.keys(packet).some(key => key !== 'candidates') || !('candidates' in packet)
        || !Array.isArray(packet.candidates) || packet.candidates.length > 200) {
      throw new CliValidationError('The file must contain only candidates: an array of at most 200 occurrences. Empty batches are allowed.');
    }
    const seen = new Set<string>();
    const roots = new Set<string>();
    for (const candidate of packet.candidates) {
      if (!candidate || typeof candidate !== 'object' || !candidate.candidate_id || seen.has(candidate.candidate_id)) throw new CliValidationError('Every occurrence needs a unique candidate_id.');
      seen.add(candidate.candidate_id);
      if (candidate.duplicate_of) {
        if (candidate.duplicate_item_id || !roots.has(candidate.duplicate_of) || !candidate.dedup_reason) throw new CliValidationError('duplicate_of needs an earlier canonical candidate and dedup_reason.');
      } else {
        roots.add(candidate.candidate_id);
        if (candidate.duplicate_item_id ? !candidate.dedup_reason : !['INCORRECT', 'INCOMPLETE'].includes(candidate.issue_type) || !candidate.reason) throw new CliValidationError('Provide a supported issue_type and reason, or a historical duplicate_item_id and dedup_reason.');
      }
      if (!candidate.source || ['open_id', 'agent_session_id', 'question_id', 'answer_id', 'days', 'end_time'].some(key => !candidate.source[key])) throw new CliValidationError('Each source must preserve the exact scenario identity and scan window.');
    }
    input.candidates = packet.candidates;
  }
  return input;
}

function command(action: string, description: string, flags: Flag[], read = false) {
  return createAnalysisCapabilityCommand({
    resource: 'bad-case', command: action, capabilityId: `analysis.bad_case.${action.replaceAll('-', '_')}`,
    description, risk: read ? 'read' : 'write', flags: [project, ...flags],
    buildInput: ctx => badCaseInput(action, [project, ...flags], ctx),
    ...(action === 'review' ? { postProcess: (result: unknown, input: Record<string, unknown>, ctx: RuntimeContext) =>
      syncBadCaseEvaluation(ctx, Number(input.project_id), result) } : {}),
  });
}

export const badCaseBegin = command('begin', 'Begin a project-serialized discovery batch. Renew its 15-minute lease every minute; preserve request ID on retry.', [request, { name: 'source-task-id', type: 'string', desc: 'Actual scheduled task ID, if known.' }]);
export const badCaseRun = command('run', 'Heartbeat or fail the current discovery. Failure never deletes earlier cases.', [batch, { name: 'action', type: 'string', required: true, desc: 'HEARTBEAT or FAILED.' }]);
export const badCaseHistory = command('history', 'Read all historical cases for Agent semantic deduplication, including pending, approved, rejected and CLI-only cases.', [limit, { name: 'after-id', type: 'string', desc: 'Follow next_after_id until has_more=false. Default 0.' }], true);
export const badCaseSubmit = command('submit', 'Submit Agent-assessed and semantically deduplicated occurrences from a JSON file. Saves a batch even when all occurrences are duplicates. Never approves.', [batch, { name: 'input-file', type: 'string', required: true, desc: 'JSON file containing {candidates:[...]}; follow bad_case_review.md for new and duplicate occurrence shapes.' }, { name: 'submit-to-page', type: 'boolean', desc: 'Explicitly publish new and reused pending cases for page review. Default false for the CLI-only workflow.' }]);
export const badCaseList = command('list', 'List saved Bad Cases across all batches, including CLI-only cases.', [limit, { name: 'offset', type: 'number', desc: 'Zero-based offset; default 0.' }, { name: 'query', type: 'string', desc: 'Search question or discovery reason.' }, { name: 'state', type: 'string', desc: 'PENDING, APPROVED or REJECTED; omit for all.' }], true);
export const badCaseGet = command('get', 'Read the reviewed question, answer, CLI calls and optional human supplement.', [item], true);
export const badCaseReview = command('review', 'Record an explicit human decision, then synchronize the saved case directly with AE. A saved review remains successful if synchronization fails; inspect evaluation.state and retry with sync-evaluation.', [item, request, { name: 'version', type: 'string', required: true, desc: 'Exact version returned by get.' }, { name: 'decision', type: 'string', required: true, desc: 'APPROVE or REJECT a pending case; REVOKE an approved or rejected case to PENDING. Only as explicitly directed by the human.' }, { name: 'supplement', type: 'string', sensitive: true, desc: 'Optional correct answer, evidence or caveats. Omit when revoking rejection to preserve its supplement.' }]);
export const badCaseSubmitToPage = command('submit-to-page', 'Publish an existing pending case for page review without copying it or changing its review state.', [item, request]);
export const badCaseSyncEvaluation = {
  ...badCaseGet,
  command: 'sync-evaluation', capabilityId: undefined, risk: 'write' as const,
  description: 'Retry AE synchronization using the latest saved review. Does not change the review decision; reports synchronization state.',
  execute: async (ctx: RuntimeContext) => syncBadCaseEvaluation(ctx, Number(ctx.str('project-id')), unwrapOutputData(await badCaseGet.execute(ctx))),
};
export default [badCaseBegin, badCaseRun, badCaseHistory, badCaseSubmit, badCaseList, badCaseGet, badCaseReview, badCaseSubmitToPage, badCaseSyncEvaluation];
