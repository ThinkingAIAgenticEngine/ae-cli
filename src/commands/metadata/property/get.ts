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
      name: 'property-name',
      type: 'string',
      required: true,
      desc: 'Super-property technical name. Virtual, dict, and exchange-rate properties use the same field.',
    },
    {
      name: 'property-scope',
      type: 'string',
      required: true,
      desc: 'Property owner table: event (super event properties) or user (super user properties).',
    },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    property_name: ctx.str('property-name'),
    property_scope: ctx.str('property-scope'),
  }),
});
