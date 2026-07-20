import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Lists config groups of a project. */
export const configGroupList = createEngageSceneCapabilityCommand({
  resource: 'config-group',
  command: 'list',
  capabilityId: 'engage-scene.config-group.list',
  description: 'List config groups of a project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
