import { createMcpCommand, optionalNumber } from '../shared.js';

export const createEntity = createMcpCommand({
  command: '+create_entity',
  description: 'Create a new entity that links an event or user property as an analysis dimension.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'entity_name', type: 'string', required: true, desc: 'Entity name' },
    { name: 'column_name', type: 'string', required: true, desc: 'Property column name to associate with the entity' },
    { name: 'table_type', type: 'number', required: true, desc: 'Table type: 0 = event property, 1 = user property' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    entityName: ctx.str('entity_name'),
    columnName: ctx.str('column_name'),
    tableType: ctx.num('table_type'),
  }),
});
