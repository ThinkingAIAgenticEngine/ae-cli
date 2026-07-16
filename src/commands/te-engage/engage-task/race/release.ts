import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Manually releases a race experiment group. */
export const raceRelease = createEngageTaskCapabilityCommand({
  resource: 'race',
  command: 'release',
  capabilityId: 'engage-task.race.release',
  description: 'Manually release a race experiment group for an engagement task.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
    { name: 'exp-group-id', type: 'string', required: true, desc: 'Race experiment group ID to release.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    task_id: ctx.str('task-id'),
    exp_group_id: ctx.str('exp-group-id'),
  }),
});
