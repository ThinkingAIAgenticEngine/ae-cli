import { createCapabilityCommand } from '../shared.js';

export const dataTableList = createCapabilityCommand({
  resource: 'data-table',
  command: 'list',
  capabilityId: 'metadata.data_table.list',
  description: 'List metadata data tables in a project. Requires metadata view permission.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
