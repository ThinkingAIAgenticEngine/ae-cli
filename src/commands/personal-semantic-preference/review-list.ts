import {
  compactInput,
  createPersonalSemanticPreferenceCommand,
  optionalNumber,
  optionalString,
} from './shared.js';

const REVIEW_STATUSES = ['none', 'pending', 'adopted', 'rejected'];
const CONTEXT_TYPES = ['preference', 'asset_context', 'experience', 'background'];

export const personalSemanticPreferenceReviewList = createPersonalSemanticPreferenceCommand({
  resource: '',
  command: 'review-list',
  capabilityId: 'business_semantics.personal_context.review_list',
  description: 'List all project personal semantic preferences for admin review.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'project-review-status', type: 'string', desc: 'none | pending | adopted | rejected.' },
    { name: 'owner', type: 'string', desc: 'Owner selector: user name, login name, or user ID. open_id is not accepted.' },
    { name: 'context-type', type: 'string', desc: 'preference | asset_context | experience | background.' },
    { name: 'keyword', type: 'string', desc: 'Match title, summary, content, or keywords.' },
    { name: 'limit', type: 'number', desc: 'Page size. Defaults to 50.', min: 1, max: 200 },
    { name: 'offset', type: 'number', desc: 'Zero-based page offset.', min: 0 },
  ],
  risk: 'read',
  validate: (ctx) => {
    const status = ctx.str('project-review-status');
    if (status !== '' && !REVIEW_STATUSES.includes(status)) {
      throw new Error(`--project-review-status must be one of: ${REVIEW_STATUSES.join(', ')}.`);
    }
    const contextType = ctx.str('context-type');
    if (contextType !== '' && !CONTEXT_TYPES.includes(contextType)) {
      throw new Error(`--context-type must be one of: ${CONTEXT_TYPES.join(', ')}.`);
    }
  },
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    project_review_status: optionalString(ctx, 'project-review-status'),
    owner: optionalString(ctx, 'owner'),
    context_type: optionalString(ctx, 'context-type'),
    keyword: optionalString(ctx, 'keyword'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
