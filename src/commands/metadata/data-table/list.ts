import { createCapabilityCommand, optionalNumber } from '../shared.js';

export const dataTableList = createCapabilityCommand({
  resource: 'data-table',
  command: 'list',
  capabilityId: 'metadata.data_table.list',
  description: 'List metadata data tables in a project. Requires metadata view permission.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'limit', type: 'number', required: false, desc: 'Page size. Default: 50, max: 200.', alias: 'l', min: 1, max: 200 },
    { name: 'offset', type: 'number', required: false, desc: 'Zero-based page offset. Default: 0.', alias: 'o', min: 0 },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
