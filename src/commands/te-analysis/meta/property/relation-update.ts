import {
  createAnalysisCapabilityCommand,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataPropertyRelationUpdate = createAnalysisCapabilityCommand({
  resource: 'property',
  command: 'relation-update',
  capabilityId: 'metadata.property.relation_update',
  description: 'Update property type, connection relation, or event mapping.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: true, desc: 'Property table type.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), table_type: ctx.str('table-type'), payload: ctx.json('payload') }),
});
