import {
  compactInput,
  createProjectSemanticCommand,
  optionalString,
} from './shared.js';

export const projectSemanticDisable = createProjectSemanticCommand({
  resource: '',
  command: 'disable',
  capabilityId: 'business_semantics.entry.disable',
  description:
    'Disable one active project semantic in one step. Disabled semantics stop being used by CLI and Agent.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p', min: 1 },
    { name: 'semantic-id', type: 'string', required: true, desc: 'Exact semantic ID to disable.' },
    { name: 'expected-version', type: 'number', required: true, desc: 'Latest semantic revision.', min: 1 },
    { name: 'reason', type: 'string', required: true, desc: 'Business reason for disabling.' },
    { name: 'request-id', type: 'string', desc: 'Optional idempotency key; generated when omitted.', maxLength: 128 },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    semantic_id: ctx.str('semantic-id'),
    expected_version: ctx.num('expected-version'),
    reason: ctx.str('reason'),
    request_id: optionalString(ctx, 'request-id'),
  }),
});
