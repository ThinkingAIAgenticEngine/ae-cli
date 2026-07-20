import { createEngageWorkbenchCapabilityCommand } from '../../shared.js';

/** Lists the current user's workbench metric slots for a project. */
export const workbenchList = createEngageWorkbenchCapabilityCommand({
  resource: 'workbench',
  command: 'list',
  capabilityId: 'engage-workbench.workbench.list',
  description: "List the current user's workbench metric slots (auto-initialised with 4 defaults on first access).",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
