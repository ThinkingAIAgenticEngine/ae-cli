import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalNumber,
  optionalString,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const publicLinkUpdate = createAnalysisCapabilityCommand({
  resource: 'public-link',
  command: 'update',
  capabilityId: 'analysis.public_link.update',
  description: 'Update a public link.',
  flags: [
    projectIdFlag,
    { name: 'company-id', type: 'number', required: false, desc: 'Company ID. Derived from project ID when omitted.' },
    { name: 'link-id', type: 'number', required: true, desc: 'Public link ID.' },
    { name: 'access-controls', type: 'json', required: false, desc: 'Public link access-control JSON.' },
    { name: 'remark', type: 'string', required: false, desc: 'Public link remark.' },
    { name: 'effective-at', type: 'string', required: true, desc: 'Effective time, yyyy-MM-dd HH:mm:ss.' },
    { name: 'expires-at', type: 'string', required: true, desc: 'Expiration time, yyyy-MM-dd HH:mm:ss.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    company_id: optionalNumber(ctx, 'company-id'),
    link_id: ctx.num('link-id'),
    access_controls: optionalJson(ctx, 'access-controls'),
    remark: optionalString(ctx, 'remark'),
    effective_at: ctx.str('effective-at'),
    expires_at: ctx.str('expires-at'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
