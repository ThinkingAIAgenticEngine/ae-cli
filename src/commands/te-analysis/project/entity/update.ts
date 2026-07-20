import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  projectIdFlag,
} from '../../capability-shared.js';

export const projectEntityUpdate = createAnalysisCapabilityCommand({
  resource: 'project entity',
  command: 'update',
  capabilityId: 'project.entity.update',
  description: 'Update an analysis entity.',
  flags: [
    projectIdFlag,
    { name: 'entity-id', type: 'number', required: true, desc: 'Analysis entity ID.' },
    { name: 'entity-name', type: 'string', required: true, desc: 'Entity display name.' },
    { name: 'column-name', type: 'string', required: true, desc: 'Property column name to bind.' },
    { name: 'table-type', type: 'number', required: true, desc: 'Main table type: 0 for event property, 1 for user property.' },
    { name: 'order', type: 'number', required: false, desc: 'Optional entity display order.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    entity_id: ctx.num('entity-id'),
    entity_name: ctx.str('entity-name'),
    column_name: ctx.str('column-name'),
    table_type: ctx.num('table-type'),
    order: optionalNumber(ctx, 'order'),
  }),
});
