import { createEngageActivityCapabilityCommand } from '../../shared.js';
import { validateStandaloneActivityPayload } from '../payload-validation.js';

/** Creates a standalone task under an activity from an OperationTaskOpDTO payload. */
export const taskCreate = createEngageActivityCapabilityCommand({
  resource: 'task',
  command: 'create',
  capabilityId: 'engage-activity.task.create',
  description: 'Create a standalone task under an activity from an OperationTaskOpDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc: 'OperationTaskOpDTO JSON body. Use triggerType 0/1, fixed_time_zone, no experiment, and one content group. Custom audiences use definitionRequest. Set activityId and leave topicId empty.',
    },
  ],
  risk: 'write',
  validate: (ctx) => validateStandaloneActivityPayload(ctx.json('payload')),
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
