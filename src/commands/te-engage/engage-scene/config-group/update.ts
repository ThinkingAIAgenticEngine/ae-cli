import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Renames a config group. */
export const configGroupUpdate = createEngageSceneCapabilityCommand({
  resource: 'config-group',
  command: 'update',
  capabilityId: 'engage-scene.config-group.update',
  description: 'Rename a config group.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'group-id', type: 'number', required: true, desc: 'Group ID to update.' },
    { name: 'group-name', type: 'string', required: true, desc: 'New group name (<=80 chars).' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    group_id: ctx.num('group-id'),
    group_name: ctx.str('group-name'),
  }),
});
