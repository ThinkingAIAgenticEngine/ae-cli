import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Gets a flow node configuration schema. */
export const nodeConfigSchema = createEngageFlowCapabilityCommand({
  resource: 'node-config', command: 'schema', capabilityId: 'engage-flow.node-config.schema',
  description: 'Get the configuration schema for one flow node type.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'node-type', type: 'string', required: true, desc: 'Flow node type.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), node_type: ctx.str('node-type') }),
});
