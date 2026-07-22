import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Gets one flow canvas. */
export const flowGet = createEngageFlowCapabilityCommand({
  resource: 'flow', command: 'get', capabilityId: 'engage-flow.flow.get',
  description: 'Get one flow canvas by UUID.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'flow-uuid', type: 'string', required: true, desc: 'Flow UUID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), flow_uuid: ctx.str('flow-uuid') }),
});
