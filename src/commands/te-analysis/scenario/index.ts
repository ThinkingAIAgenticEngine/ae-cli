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
    const started = ctx.str('start-time');
    if (started) input.duration_ms = scenarioDuration(started);
  } else if (ctx.json('query-path') !== undefined || ctx.str('answer-id') || ctx.str('user-message') || ctx.str('start-time')) {
    throw new CliValidationError('user_feedback records user text and its target only; do not attach an answer or query path.');
  }
  return input;
}

function scenarioTransportInput(ctx: RuntimeContext, append = false): Record<string, unknown> {
  const input = scenarioInput(ctx, append);
  const field = append ? 'text' : 'answer';
  const original = input[field] as string;
  const bytes = Buffer.from(original, 'utf8');
  if (bytes.toString('utf8') !== original) {
    throw new CliValidationError(`${field} must contain valid Unicode text.`);
  }
  return { ...input, [field]: bytes.toString('base64'), content_encoding: 'base64' };
}

const commonFlags: Flag[] = [
  { name: 'start-time', type: 'string', desc: 'Exact start_time returned by scenario begin for this answer. CLI computes one question-to-answer duration; omit if not captured.' },
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
  ], buildInput: (ctx) => scenarioTransportInput(ctx),
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
  ], buildInput: (ctx) => scenarioTransportInput(ctx, true),
}));
export function scenarioDuration(start: string, now = Date.now()): number {
  const millis = Date.parse(start);
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(start) || !Number.isFinite(millis)
      || !new Date(`${start.slice(0, 10)}T00:00:00Z`).toISOString().startsWith(start.slice(0, 10))
      || millis > now || now - millis > 7776000000) {
    throw new CliValidationError('start-time must be a real ISO-8601 timestamp within the last 90 days, copied from scenario begin.');
  }
  return now - millis;
}

export const scenarioBegin: Command = {
  service: 'analysis', resource: 'scenario', command: 'begin', risk: 'read', usesAeHost: false,
  description: 'Capture the start of this question locally. No network request or file write. Reuse start_time when collecting the ready answer.',
  flags: [],
  execute: async () => ({ start_time: new Date().toISOString() }),
};

export function scenarioListInput(ctx: RuntimeContext): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const [flag, min, max, fallback] of [
    ['project-id', 1, 2147483647, undefined], ['days', 1, 90, 7],
    ['limit', 1, 50, 20], ['offset', 0, 2147483647, 0],
  ] as const) {
    const value = ctx.str(flag) === '' ? fallback : Number(ctx.str(flag));
    if (value === undefined || !Number.isInteger(value) || value < min || value > max) {
      throw new CliValidationError(`${flag} must be an integer between ${min} and ${max}.`);
    }
    input[flag.replaceAll('-', '_')] = value;
  }
  const end = ctx.str('end-time');
  if (end) {
    if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(end) || !Number.isFinite(Date.parse(end))
        || !new Date(`${end.slice(0, 10)}T00:00:00Z`).toISOString().startsWith(end.slice(0, 10))) {
      throw new CliValidationError('end-time must be an ISO-8601 timestamp with a timezone.');
    }
    // Reuse the server boundary losslessly; Date serialization truncates sub-millisecond precision.
    input.end_time = end;
  }
  return input;
}

export const scenarioList = createAnalysisCapabilityCommand({
  resource: 'scenario', command: 'list', capabilityId: 'analysis.scenario.list', risk: 'read',
  description: 'Read archived scenario questions with optional answer duration, exact answers, feedback and revisions. Follow the scenario review Skill for semantic deduplication and badcase assessment.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Project to review. Requires project configuration permission to read collected content.' },
    { name: 'days', type: 'number', desc: 'Recent calendar days including today in the deployment timezone. Default 7; range 1..90.' },
    { name: 'limit', type: 'number', desc: 'Complete scenarios per page. Default 20; range 1..50.' },
    { name: 'offset', type: 'number', desc: 'Scenario offset. Default 0; follow meta.next_offset until meta.has_more is false.' },
    { name: 'end-time', type: 'string', desc: 'Exclusive ISO-8601 snapshot boundary. Reuse the first response meta.end_time and the same days on every subsequent page.' },
  ],
  buildInput: scenarioListInput,
});
export function scenarioGetInput(ctx: RuntimeContext): Record<string, unknown> {
  const { limit, offset, ...input } = scenarioListInput(ctx);
  for (const key of ['open-id', 'agent-session-id', 'question-id']) {
    input[key.replaceAll('-', '_')] = text(ctx.str(key), key, 191);
  }
  return input;
}

export const scenarioGet = createAnalysisCapabilityCommand({
  resource: 'scenario', command: 'get', capabilityId: 'analysis.scenario.get', risk: 'read',
  description: 'Read one archived question with answer duration and linked CLI inputs, execution results, costs and errors. Missing evidence stays explicit.',
  flags: [
    ...scenarioList.flags.filter((flag) => !['limit', 'offset'].includes(flag.name)),
    { name: 'open-id', type: 'string', required: true, desc: 'Exact initial.open_id from scenario list. Project configuration permission is still required.' },
    { name: 'agent-session-id', type: 'string', required: true, desc: 'Exact initial.agent_session_id from scenario list.' },
    { name: 'question-id', type: 'string', required: true, desc: 'Exact initial.question_id from scenario list.' },
  ], buildInput: scenarioGetInput,
});
export default [scenarioBegin, scenarioCollect, scenarioAppend, scenarioList, scenarioGet];
