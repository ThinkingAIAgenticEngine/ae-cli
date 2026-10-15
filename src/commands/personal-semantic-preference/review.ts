import {
  compactInput,
  createPersonalSemanticPreferenceCommand,
  optionalJsonStringArray,
  optionalString,
} from './shared.js';

const ACTIONS = ['adopt', 'reject'];

export const personalSemanticPreferenceReview = createPersonalSemanticPreferenceCommand({
  resource: '',
  command: 'review',
  capabilityId: 'business_semantics.personal_context.review',
  description: 'Adopt or reject personal semantic preferences, including unsubmitted ones, for future project KB refresh.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'ids', type: 'json', required: true, desc: 'JSON array of preference IDs from review-list.' },
    { name: 'action', type: 'string', required: true, desc: 'adopt | reject.' },
    { name: 'project-review-note', type: 'string', desc: 'Optional reviewer note.', maxLength: 1000 },
    { name: 'request-id', type: 'string', desc: 'Optional idempotency key; generated when omitted.', maxLength: 128 },
  ],
  risk: 'write',
  validate: (ctx) => {
    const action = ctx.str('action');
    if (!ACTIONS.includes(action)) {
      throw new Error(`--action must be one of: ${ACTIONS.join(', ')}.`);
    }
    const ids = optionalJsonStringArray(ctx, 'ids', '--ids');
    if (!ids || ids.length === 0) {
      throw new Error('--ids must contain at least one preference ID.');
    }
    if (ids.length > 100) {
      throw new Error('--ids must contain at most 100 preference IDs.');
    }
  },
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    ids: optionalJsonStringArray(ctx, 'ids', '--ids'),
    action: ctx.str('action'),
    project_review_note: optionalString(ctx, 'project-review-note'),
    request_id: optionalString(ctx, 'request-id'),
  }),
});
