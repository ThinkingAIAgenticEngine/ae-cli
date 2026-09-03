import {
  compactInput,
  createProjectSemanticCommand,
  optionalNumber,
  optionalString,
} from '../shared.js';

export const projectSemanticCandidateList = createProjectSemanticCommand({
  resource: 'candidate',
  command: 'list',
  capabilityId: 'business_semantics.candidate.list',
  description: 'List Agent recommendations grouped by topic domain.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'status', type: 'string', desc: 'Internal recommendation status filter.' },
    { name: 'topic-group-id', type: 'string', desc: 'Optional exact topic group ID.' },
    { name: 'limit', type: 'number', desc: 'Directory page size.', min: 1, max: 200 },
    { name: 'offset', type: 'number', desc: 'Zero-based directory page offset.', min: 0 },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    status: optionalString(ctx, 'status'),
    topic_group_id: optionalString(ctx, 'topic-group-id'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
