import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Creates a topic and its tasks under an activity from a TopicAddDTO payload. */
export const topicCreate = createEngageActivityCapabilityCommand({
  resource: 'topic',
  command: 'create',
  capabilityId: 'engage-activity.topic.create',
  description: 'Create a topic and its tasks under an activity from a TopicAddDTO payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc:
        'TopicAddDTO JSON body. Required: activityId, topicName, targetClusterType, channelType, channelId, triggerType, enableChannelTouchLimits, frequencyLimits, tasks. When targetClusterType=2 use topicClusterKey (not clusterKey); when =1 use topicQp. Task items use taskQp/clusterKey.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
