import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Deletes a config item through the preserved config deletion workflow. */
export const configItemDelete = createEngageSceneCapabilityCommand({
  resource: 'config-item',
  command: 'delete',
  capabilityId: 'engage-scene.config-item.delete',
  description: 'Delete a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'open-id', type: 'string', required: true, desc: 'Operator open ID.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    open_id: ctx.str('open-id'),
  }),
});
