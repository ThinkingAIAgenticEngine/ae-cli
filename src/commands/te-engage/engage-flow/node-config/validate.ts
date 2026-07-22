import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Validates a flow node configuration. */
export const nodeConfigValidate = createEngageFlowCapabilityCommand({
  resource: 'node-config', command: 'validate', capabilityId: 'engage-flow.node-config.validate',
  description: 'Validate one flow node configuration.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'node-type', type: 'string', required: true, desc: 'Flow node type.' },
    { name: 'config', type: 'string', required: true, desc: 'Node configuration JSON encoded as a string.' },
    { name: 'operation-mode', type: 'string', required: true, desc: 'Validation mode.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    node_type: ctx.str('node-type'),
    config: ctx.str('config'),
    operation_mode: ctx.str('operation-mode'),
  }),
});
