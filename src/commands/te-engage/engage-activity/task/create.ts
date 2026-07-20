import { createEngageActivityCapabilityCommand } from '../../shared.js';

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
      desc: 'OperationTaskOpDTO JSON body (taskName, channelType, channelId, groupContentList, targetClusterType, triggerType, completionIndicatorDef, frequencyLimits, groupId, activityId, triggerTimeStrategy, ...). Set activityId; leave topicId empty for a standalone task.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
