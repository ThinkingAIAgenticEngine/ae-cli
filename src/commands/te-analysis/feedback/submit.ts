import { createHash, randomUUID } from 'node:crypto';
import { readCliAgentContext } from '../../../core/cli-agent-context.js';
import { CliValidationError } from '../../../core/errors.js';
import { createAnalysisCapabilityCommand } from '../capability-shared.js';
import type { RuntimeContext } from '../../../framework/types.js';

export const analysisQueryCapabilities = new Set([
  'analysis.adhoc.run', 'analysis.adhoc.export', 'analysis.report_data.run', 'analysis.report_data.export',
  'analysis.dashboard_report_data.run', 'analysis.dashboard_report_data.export',
  'analysis.bi_panel_page_data.run', 'analysis.bi_panel_page_data.export',
  'analysis.event_detail.run', 'analysis.event_detail.export', 'analysis.entity_detail.run', 'analysis.entity_detail.export',
  'analysis.query.drilldown_events', 'analysis.query.drilldown_events_export',
  'analysis.query.drilldown_entities', 'analysis.query.drilldown_entities_export',
  'analysis.query.drilldown_user_events', 'analysis.query.drilldown_user_events_export',
  'analysis.query.drilldown_session_details',
]);

export function analysisFeedbackInput(ctx: RuntimeContext): Record<string, unknown> {
  if (!ctx.bool('query-completed')) throw new CliValidationError('Feedback requires a completed data query and final analysis answer.');
  const queryCapabilityId = ctx.str('query-capability-id');
  if (!analysisQueryCapabilities.has(queryCapabilityId)) throw new CliValidationError('query-capability-id must identify an executed analysis data query.');
  const ratings = ['satisfied', 'partially_satisfied', 'dissatisfied', 'unable_to_judge'];
  const satisfaction = ctx.str('satisfaction');
  if (!ratings.includes(satisfaction)) throw new CliValidationError('satisfaction must be an explicit user feedback category.');
  const feedbackText = ctx.str('feedback-text');
  if (!feedbackText.trim() || feedbackText.length > 2048) throw new CliValidationError('feedback-text must contain original user feedback up to 2048 characters.');
  const context = readCliAgentContext();
  if (!context.agent_session_id) throw new CliValidationError('The Agent context file must contain the evaluated agent_session_id.');
  const turns: unknown = ctx.json('target-turn-ids') ?? [];
  if (!Array.isArray(turns) || turns.length > 32 || turns.some((id) => typeof id !== 'string' || !id.trim() || id.length > 191)) {
    throw new CliValidationError('target-turn-ids must be an array of at most 32 nonblank existing turn IDs.');
  }
  if (turns.includes(context.agent_turn_id)) throw new CliValidationError('target-turn-ids must reference analysis turns, not the feedback turn.');
  const targetTurns = [...new Set(turns)];
  const suppliedId = ctx.str('feedback-id');
  const feedbackId = suppliedId || (context.agent_turn_id
    ? createHash('sha256').update(JSON.stringify([context.agent_session_id, context.agent_turn_id, targetTurns, queryCapabilityId, satisfaction, feedbackText])).digest('hex')
    : randomUUID());
  if (!feedbackId.trim() || feedbackId.length > 128) throw new CliValidationError('feedback-id must be a nonblank string up to 128 characters.');
  const routeSummary = ctx.str('route-summary');
  if (routeSummary.length > 2048) throw new CliValidationError('route-summary must be at most 2048 characters.');
  const projectId = ctx.optionalNum('project-id');
  if (projectId !== undefined && (!Number.isInteger(projectId) || projectId <= 0)) {
    throw new CliValidationError('project-id must be a positive integer.');
  }
  return {
    feedback_id: feedbackId, agent_session_id: context.agent_session_id, target_turn_ids: targetTurns,
    query_completed: true, query_capability_id: queryCapabilityId, satisfaction, feedback_text: feedbackText,
    ...(projectId !== undefined ? { project_id: projectId } : {}),
    ...(routeSummary.trim() ? { route_summary: routeSummary } : {}),
  };
}

export const analysisFeedbackSubmit = createAnalysisCapabilityCommand({
  resource: 'feedback', command: 'submit', capabilityId: 'analysis.feedback.submit', risk: 'write',
  description: 'Submit explicit user feedback after a completed analysis data query and final answer. Reuses Agent session and analysis turn IDs; never submits an answer body.',
  flags: [
    { name: 'query-completed', type: 'boolean', desc: 'Confirm that query results and the final analysis answer have been delivered.' },
    { name: 'query-capability-id', type: 'string', required: true, desc: 'Executed analysis data-query capability ID in the evaluated turns.' },
    { name: 'satisfaction', type: 'string', required: true, desc: 'Explicit rating: satisfied, partially_satisfied, dissatisfied, or unable_to_judge.' },
    { name: 'feedback-text', type: 'string', required: true, sensitive: true, desc: 'Original user feedback, up to 2048 characters. No answer content.' },
    { name: 'target-turn-ids', type: 'json', desc: 'JSON array of evaluated analysis turn IDs; omit only when unknown.' },
    { name: 'route-summary', type: 'string', sensitive: true, desc: 'Optional brief verifiable route and asset-selection rationale. No answer content.' },
    { name: 'feedback-id', type: 'string', desc: 'Stable feedback ID for retries; defaults to current session/feedback-turn fingerprint when available.' },
    { name: 'project-id', type: 'number', desc: 'Evaluated analysis project ID when available.' },
  ],
  buildInput: analysisFeedbackInput,
});
