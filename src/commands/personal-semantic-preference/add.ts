import {
  compactInput,
  createPersonalSemanticPreferenceCommand,
  optionalKeywords,
  optionalResourceRefs,
  optionalString,
  validatePersonalSemanticWrite,
} from './shared.js';

export const personalSemanticPreferenceAdd = createPersonalSemanticPreferenceCommand({
  resource: '',
  command: 'add',
  capabilityId: 'business_semantics.personal_context.add',
  description: 'Add one personal semantic preference for the authenticated user.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'context-type', type: 'string', required: true, desc: 'preference | asset_context | experience | background.' },
    { name: 'title', type: 'string', required: true, desc: 'Short preference title.', maxLength: 255 },
    { name: 'summary', type: 'string', required: true, desc: 'Compact preference summary.', maxLength: 1000 },
    { name: 'content', type: 'string', required: true, desc: 'Full personal semantic preference content.', maxLength: 20000 },
    { name: 'keywords', type: 'json', desc: 'Optional JSON array of preference keywords.' },
    { name: 'resource-refs', type: 'json', desc: 'Ordered JSON asset references; required only for asset_context.' },
    { name: 'fresh-until-at', type: 'string', desc: 'Optional freshness expiration timestamp: yyyy-MM-dd HH:mm:ss.' },
    { name: 'request-id', type: 'string', desc: 'Optional idempotency key; generated when omitted.', maxLength: 128 },
  ],
  risk: 'write',
  validate: validatePersonalSemanticWrite,
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    context_type: ctx.str('context-type'),
    title: ctx.str('title'),
    summary: ctx.str('summary'),
    content: ctx.str('content'),
    keywords: optionalKeywords(ctx),
    resource_refs: optionalResourceRefs(ctx),
    fresh_until_at: optionalString(ctx, 'fresh-until-at'),
    request_id: optionalString(ctx, 'request-id'),
  }),
});
