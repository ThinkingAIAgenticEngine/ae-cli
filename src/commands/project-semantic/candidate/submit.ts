import {
  arrayValue,
  compactInput,
  createProjectSemanticCommand,
  optionalJson,
  optionalString,
  readJsonFile,
} from '../shared.js';
import type { RuntimeContext } from '../../../framework/types.js';

export const projectSemanticCandidateSubmit = createProjectSemanticCommand({
  resource: 'candidate',
  command: 'submit',
  capabilityId: 'business_semantics.candidate.submit',
  description: 'Submit CLI-Agent generated project semantic candidates grouped by topic domain.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'topic-groups', type: 'json', desc: 'Topic-domain grouped recommendations JSON array.' },
    { name: 'submit-file', type: 'string', desc: 'JSON file containing topic_groups or an array of groups.' },
    { name: 'snapshot-hash', type: 'string', desc: 'Optional exported asset package SHA-256.' },
    { name: 'request-id', type: 'string', desc: 'Optional idempotency key; generated when omitted.', maxLength: 128 },
  ],
  risk: 'write',
  validate: validateSubmitSource,
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    snapshot_hash: optionalString(ctx, 'snapshot-hash'),
    topic_groups: topicGroups(ctx),
    request_id: optionalString(ctx, 'request-id'),
  }),
});

function validateSubmitSource(ctx: RuntimeContext): void {
  topicGroups(ctx);
}

function topicGroups(ctx: RuntimeContext): unknown[] {
  const hasInline = ctx.str('topic-groups') !== '';
  const hasFile = ctx.str('submit-file') !== '';
  if (hasInline === hasFile) {
    throw new Error('Provide exactly one of --topic-groups or --submit-file.');
  }
  const raw = hasInline ? optionalJson(ctx, 'topic-groups') : readJsonFile(ctx.str('submit-file'), 2 * 1024 * 1024);
  const groups = Array.isArray(raw)
    ? raw
    : arrayValue((raw as Record<string, unknown>)?.topic_groups, '--submit-file topic_groups');
  if (groups.length < 1 || groups.length > 100) {
    throw new Error('topic_groups must contain 1 to 100 groups.');
  }
  return groups;
}
