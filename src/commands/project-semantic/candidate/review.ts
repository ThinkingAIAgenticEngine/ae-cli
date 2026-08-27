import {
  compactInput,
  createProjectSemanticCommand,
  optionalString,
} from '../shared.js';

export const projectSemanticCandidateReview = createProjectSemanticCommand({
  resource: 'candidate',
  command: 'review',
  capabilityId: 'business_semantics.candidate.review',
  description: 'Approve, reject, or reopen one project semantic candidate.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'candidate-id', type: 'string', required: true, desc: 'Exact candidate ID.' },
    { name: 'expected-version', type: 'number', required: true, desc: 'Latest optimistic-lock version.', min: 1 },
    { name: 'action', type: 'string', required: true, desc: 'Review action: approve, reject, or reopen.' },
    { name: 'review-note', type: 'string', desc: 'Optional reviewer note.' },
    { name: 'request-id', type: 'string', desc: 'Optional idempotency key; generated when omitted.', maxLength: 128 },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    candidate_id: ctx.str('candidate-id'),
    expected_version: ctx.num('expected-version'),
    action: ctx.str('action'),
    review_note: optionalString(ctx, 'review-note'),
    request_id: optionalString(ctx, 'request-id'),
  }),
});
