import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Lists task groups in a project. */
export const groupList = createEngageTaskCapabilityCommand({
  resource: 'group',
  command: 'list',
  capabilityId: 'engage-task.group.list',
  description: 'List task groups in a project.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
  }),
});
