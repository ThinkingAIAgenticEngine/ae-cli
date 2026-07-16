import { createEngageTaskCapabilityCommand } from '../../shared.js';

/** Queries operation records and runtime application logs for an engagement task. */
export const operationLogQuery = createEngageTaskCapabilityCommand({
  resource: 'operation-log',
  command: 'query',
  capabilityId: 'engage-task.operation-log.query',
  description:
    'Query task operation records and runtime logs for creation, changes, approval, sending, pauses, and completion.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'task-id', type: 'string', required: true, desc: 'Engagement task ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), task_id: ctx.str('task-id') }),
});
