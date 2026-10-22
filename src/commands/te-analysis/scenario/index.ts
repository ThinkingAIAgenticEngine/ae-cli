import { readCliAgentContext } from '../../../core/cli-agent-context.js';
import { executeCapabilityWithEnvelope } from '../../../core/capability-api.js';
import { CliValidationError } from '../../../core/errors.js';
import { withOutputMetadata } from '../../../framework/output.js';
import { createAnalysisCapabilityCommand } from '../capability-shared.js';
import { analysisQueryCapabilities } from '../feedback/submit.js';
import type { Command, Flag, RuntimeContext } from '../../../framework/types.js';

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new CliValidationError(`${field} must be nonblank and at most ${max} characters.`);
  return value;
}

export function scenarioInput(ctx: RuntimeContext, append = false): Record<string, unknown> {
  const agent = readCliAgentContext();
  const session = text(agent.agent_session_id ?? '', 'agent_session_id', 191);
  const questionId = text(ctx.str('question-id') || (!append ? agent.agent_turn_id ?? '' : ''), 'question-id', 191);
  const projectId = ctx.optionalNum('project-id');
  if (projectId !== undefined && (!Number.isInteger(projectId) || projectId <= 0)) throw new CliValidationError('project-id must be a positive integer.');
  const input: Record<string, unknown> = { agent_session_id: session, question_id: questionId,
    ...(projectId !== undefined ? { project_id: projectId } : {}) };
  const entryType = append ? text(ctx.str('entry-type'), 'entry-type', 32) : 'answer';
  if (!['answer', 'user_feedback', 'answer_revision'].includes(entryType) || (append && entryType === 'answer')) {
    throw new CliValidationError('entry-type must be user_feedback or answer_revision.');
  }
  if (append) {
    input.entry_type = entryType;
    input.entry_id = text(ctx.str('entry-id') || (agent.agent_turn_id ? `${agent.agent_turn_id}:${entryType}` : ''), 'entry-id', 191);
    input.target_answer_id = text(ctx.str('target-answer-id'), 'target-answer-id', 191);
    input.text = text(ctx.str('text'), 'text', entryType === 'user_feedback' ? 4096 : 16384);
  } else {
    input.question = text(ctx.str('question'), 'question', 8192);
    input.answer = text(ctx.str('answer'), 'answer', 16384);
  }
  if (entryType !== 'user_feedback') {
    if (append && ctx.str('user-message')) input.user_message = text(ctx.str('user-message'), 'user-message', 4096);
    input.answer_id = text(ctx.str('answer-id') || (agent.agent_turn_id ? `answer:${agent.agent_turn_id}` : ''), 'answer-id', 191);
    if (input.answer_id === input.target_answer_id) throw new CliValidationError('A revision requires a new answer-id; target-answer-id must preserve the previous answer.');
    const path = ctx.json('query-path');
    if (!Array.isArray(path) || !path.length || path.length > 64) throw new CliValidationError('query-path must contain 1..64 ordered CLI call references.');
    for (const step of path) {
      if (!step || typeof step !== 'object' || Array.isArray(step)
          || Object.keys(step).some((key) => !['capability_id', 'invocation_id', 'client_request_id', 'purpose'].includes(key))
          || typeof step.capability_id !== 'string' || !/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(step.capability_id)
          || ['analysis.scenario.collect', 'analysis.scenario.append', 'analysis.feedback.submit'].includes(step.capability_id)
          || (step.invocation_id === undefined && step.client_request_id === undefined)) {
        throw new CliValidationError('Each query-path step requires a capability_id and an existing invocation_id or client_request_id; only optional purpose is accepted. Do not include query inputs or results.');
      }
      for (const key of ['invocation_id', 'client_request_id']) if (step[key] !== undefined) text(step[key], key, 191);
      if (step.purpose !== undefined) text(step.purpose, 'purpose', 256);
    }
    if (!path.some((step) => analysisQueryCapabilities.has(step.capability_id))) throw new CliValidationError('query-path must reference at least one attempted analysis data query.');
    if (JSON.stringify(path).length > 20000) throw new CliValidationError('query-path must be at most 20000 characters.');
    input.query_path = path;
  } else if (ctx.json('query-path') !== undefined || ctx.str('answer-id') || ctx.str('user-message')) {
    throw new CliValidationError('user_feedback records user text and its target only; do not attach an answer or query path.');
  }
  return input;
}

const commonFlags: Flag[] = [
  { name: 'question-id', type: 'string', desc: 'Stable original scenario turn ID. Collect defaults to current turn; append must reuse the original ID.' },
  { name: 'answer-id', type: 'string', desc: 'Actual answer identifier; defaults to answer:<current-turn-id>. Revisions need a new ID.' },
  { name: 'query-path', type: 'json', desc: '1..64 ordered references: [{capability_id,invocation_id?,client_request_id?,purpose?}]. Prefer only returned meta.invocation_id; fallback to returned gateway meta.client_request_id, never business request_id. One analysis data-query step required. Inputs/status/timing come from existing call telemetry. Never include query results.' },
  { name: 'project-id', type: 'number', desc: 'Source analysis project. Collection is skipped if omitted or the project has not explicitly enabled scenario samples.' },
];

function withProjectCollectionPolicy(command: Command): Command {
  return {
    ...command,
    execute: async (ctx) => {
      const input = scenarioInput(ctx, command.command === 'append');
      const skipped = (reason: string) => withOutputMetadata({
        accepted: false,
        skipped: true,
        reason,
        question_id: input.question_id,
        ...(input.answer_id ? { answer_id: input.answer_id } : {}),
        ...(input.entry_id ? { entry_id: input.entry_id } : {}),
        ...(input.target_answer_id ? { target_answer_id: input.target_answer_id } : {}),
        event_name: command.command === 'append' ? 'cli_analysis_scenario_entry' : 'cli_analysis_scenario',
        delivery: 'best_effort',
      }, { capability_id: command.capabilityId });
      if (input.project_id === undefined) return skipped('PROJECT_REQUIRED');
      try {
        // Read at execution time. Never reuse the company configuration's 24-hour cache.
        const policy = await executeCapabilityWithEnvelope(ctx.host(), 'analysis', 'project.info.get', {
          project_id: input.project_id,
        });
        if (policy.data?.analysis_scenario_collection_enabled !== true) {
          return skipped('PROJECT_COLLECTION_DISABLED');
        }
      } catch {
        return skipped('PROJECT_COLLECTION_CONFIG_UNAVAILABLE');
      }
      // The service checks the project again, including changes made during this pre-check.
      return command.execute(ctx);
    },
  };
}

export const scenarioCollect = withProjectCollectionPolicy(createAnalysisCapabilityCommand({
  resource: 'scenario', command: 'collect', capabilityId: 'analysis.scenario.collect', risk: 'write',
  description: 'Collect one whole scenario question, exact final answer and ordered CLI call references. Multiple CLI calls belong to one question_id. No self-evaluation.',
  flags: [...commonFlags,
    { name: 'question', type: 'string', required: true, sensitive: true, desc: 'Original user scenario question and confirmed clarifications; up to 8192 characters.' },
    { name: 'answer', type: 'string', required: true, sensitive: true, desc: 'Exact answer text to deliver, not a summary. Up to 16384 characters. Deliver the same text after collection.' },
  ], buildInput: (ctx) => scenarioInput(ctx),
}));
export const scenarioAppend = withProjectCollectionPolicy(createAnalysisCapabilityCommand({
  resource: 'scenario', command: 'append', capabilityId: 'analysis.scenario.append', risk: 'write',
  description: 'Append verbatim user feedback or the exact substantive follow-up answer, including a recheck with unchanged conclusions, preserving earlier answers. This is not a new scenario.',
  flags: [...commonFlags,
    { name: 'entry-type', type: 'string', required: true, desc: 'user_feedback or answer_revision.' },
    { name: 'target-answer-id', type: 'string', required: true, desc: 'Existing answer being questioned or revised. Never overwrite it.' },
    { name: 'text', type: 'string', required: true, sensitive: true, desc: 'Verbatim user feedback (up to 4096) or exact revised answer (up to 16384); no judgment of whether feedback is right.' },
    { name: 'entry-id', type: 'string', desc: 'Stable append ID; defaults to current-turn-id:entry-type. Preserve on retries, independent of text edits.' },
    { name: 'user-message', type: 'string', sensitive: true, desc: 'For answer_revision only: exact triggering follow-up request, up to 4096 characters, when not already captured as user_feedback. Preserve scope changes without inventing negative feedback.' },
  ], buildInput: (ctx) => scenarioInput(ctx, true),
}));
export default [scenarioCollect, scenarioAppend];
