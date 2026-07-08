import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJsonArray,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const publicLinkDelete = createAnalysisCapabilityCommand({
  resource: 'public-link',
  command: 'delete',
  capabilityId: 'analysis.public_link.delete',
  description: 'Delete one or more public links.',
  flags: [
    projectIdFlag,
    { name: 'company-id', type: 'number', required: false, desc: 'Company ID. Derived from project ID when omitted.' },
    { name: 'link-id', type: 'number', required: false, desc: 'Public link ID.' },
    { name: 'link-ids', type: 'json', required: false, desc: 'Public link ID array.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    company_id: optionalNumber(ctx, 'company-id'),
    link_id: optionalNumber(ctx, 'link-id'),
    link_ids: optionalJsonArray(ctx, 'link-ids'),
  }),
});
