import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Lists config items of a project. */
export const configItemList = createEngageSceneCapabilityCommand({
  resource: 'config-item',
  command: 'list',
  capabilityId: 'engage-scene.config-item.list',
  description: 'List config items of a project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
