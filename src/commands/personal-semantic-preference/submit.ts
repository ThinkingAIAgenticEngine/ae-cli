import {
  compactInput,
  createPersonalSemanticPreferenceCommand,
  optionalString,
} from './shared.js';

export const personalSemanticPreferenceSubmit = createPersonalSemanticPreferenceCommand({
  resource: '',
  command: 'submit',
  capabilityId: 'business_semantics.personal_context.submit',
  description: 'Submit one personal semantic preference for project semantic review.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'id', type: 'string', required: true, desc: 'Preference ID returned by list/add.' },
    { name: 'project-review-note', type: 'string', desc: 'Optional note for the reviewer.', maxLength: 1000 },
    { name: 'request-id', type: 'string', desc: 'Optional idempotency key; generated when omitted.', maxLength: 128 },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    id: ctx.str('id'),
    project_review_note: optionalString(ctx, 'project-review-note'),
    request_id: optionalString(ctx, 'request-id'),
  }),
});
