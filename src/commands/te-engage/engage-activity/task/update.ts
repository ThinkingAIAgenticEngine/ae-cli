import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Edits a standalone task from an OperationTaskOpDTO payload. */
export const taskUpdate = createEngageActivityCapabilityCommand({
  resource: 'task',
  command: 'update',
  capabilityId: 'engage-activity.task.update',
  description: 'Edit a standalone task from an OperationTaskOpDTO payload (includes taskId).',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'payload', type: 'json', required: true, desc: 'OperationTaskOpDTO JSON body including taskId.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
