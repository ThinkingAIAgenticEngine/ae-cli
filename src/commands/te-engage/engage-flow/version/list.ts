import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Lists every version for a flow. */
export const versionList = createEngageFlowCapabilityCommand({
  resource: 'version',
  command: 'list',
  capabilityId: 'engage-flow.version.list',
  description: 'List current, historical, new, update, and test versions for a flow.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'flow-id', type: 'string', required: true, desc: 'Flow ID whose versions should be listed.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), flow_id: ctx.str('flow-id') }),
});
