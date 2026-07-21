import { createCapabilityCommand } from '../shared.js';

export const propertyGet = createCapabilityCommand({
  resource: 'property',
  command: 'get',
  capabilityId: 'metadata.property.get',
  description:
    'Get one super-property metadata detail, including virtual property definitions. Requires metadata view permission in the target project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    {
      name: 'prop-name',
      type: 'string',
      required: true,
      desc: 'Property column name.',
    },
    {
      name: 'table-type',
      type: 'string',
      required: true,
      desc: 'Property table type: event or user.',
    },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    table_type: ctx.str('table-type'),
    prop_name: ctx.str('prop-name'),
  }),
});
