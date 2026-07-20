import {
  compactInput,
  createAnalysisCapabilityCommand,
} from '../../capability-shared.js';

export const projectAccessDetailGet = createAnalysisCapabilityCommand({
  resource: 'project access-detail',
  command: 'get',
  capabilityId: 'project.access_detail.get',
  description: 'Get company project access details.',
  flags: [
    { name: 'company-id', type: 'number', required: true, desc: 'Company ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    company_id: ctx.num('company-id'),
  }),
});
