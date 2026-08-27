import {
  compactInput,
  createPersonalSemanticPreferenceCommand,
  optionalString,
} from './shared.js';

export const personalSemanticPreferenceDelete = createPersonalSemanticPreferenceCommand({
  resource: '',
  command: 'delete',
  capabilityId: 'business_semantics.personal_context.delete',
  description: 'Soft-delete one personal semantic preference using optimistic locking.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'id', type: 'string', required: true, desc: 'Preference ID returned by list/add.' },
    { name: 'expected-revision', type: 'number', required: true, desc: 'Revision returned by the latest read.', min: 1 },
    { name: 'request-id', type: 'string', desc: 'Optional idempotency key; generated when omitted.', maxLength: 128 },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    id: ctx.str('id'),
    expected_revision: ctx.num('expected-revision'),
    request_id: optionalString(ctx, 'request-id'),
  }),
});
