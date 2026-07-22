import { createEngageFlowCapabilityCommand } from '../../shared.js';

/** Lists flow canvases in a project. */
export const flowList = createEngageFlowCapabilityCommand({
  resource: 'flow', command: 'list', capabilityId: 'engage-flow.flow.list',
  description: 'List flow canvases in a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id') }),
});
