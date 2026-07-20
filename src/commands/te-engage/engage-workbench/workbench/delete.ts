import { createEngageWorkbenchCapabilityCommand } from '../../shared.js';

/** Soft-deletes a workbench metric slot owned by the current user. */
export const workbenchDelete = createEngageWorkbenchCapabilityCommand({
  resource: 'workbench',
  command: 'delete',
  capabilityId: 'engage-workbench.workbench.delete',
  description: 'Soft-delete a workbench metric slot (own slot only).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'slot-id', type: 'string', required: true, desc: 'Slot ID to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    slot_id: ctx.str('slot-id'),
  }),
});
