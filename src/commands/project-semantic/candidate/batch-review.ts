import {
  arrayValue,
  createProjectSemanticCommand,
  optionalJson,
  optionalString,
  readJsonFile,
} from '../shared.js';
import type { RuntimeContext } from '../../../framework/types.js';

export const projectSemanticCandidateBatchReview = createProjectSemanticCommand({
  resource: 'candidate',
  command: 'batch-review',
  capabilityId: 'business_semantics.candidate.batch_review',
  description: 'Approve, reject, or reopen up to 100 project semantic candidates.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'items', type: 'json', desc: 'Review decision array.' },
    { name: 'review-file', type: 'string', desc: 'JSON file containing items or an item array.' },
    { name: 'request-id', type: 'string', desc: 'Optional idempotency key; generated when omitted.', maxLength: 128 },
  ],
  risk: 'write',
  validate: (ctx) => reviewItems(ctx),
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    items: reviewItems(ctx),
    request_id: optionalString(ctx, 'request-id'),
  }),
});

function reviewItems(ctx: RuntimeContext): unknown[] {
  const hasInline = ctx.str('items') !== '';
  const hasFile = ctx.str('review-file') !== '';
  if (hasInline === hasFile) {
    throw new Error('Provide exactly one of --items or --review-file.');
  }
  const raw = hasInline ? optionalJson(ctx, 'items') : readJsonFile(ctx.str('review-file'));
  const items = Array.isArray(raw)
    ? raw
    : arrayValue((raw as Record<string, unknown>)?.items, '--review-file items');
  if (items.length < 1 || items.length > 100) {
    throw new Error('items must contain 1 to 100 review decisions.');
  }
  return items;
}
