import { createEngageActivityCapabilityCommand } from '../../shared.js';

/** Updates a topic and its task relations from a TopicModifyReq payload. */
export const topicUpdate = createEngageActivityCapabilityCommand({
  resource: 'topic',
  command: 'update',
  capabilityId: 'engage-activity.topic.update',
  description: 'Update a topic and its task relations from a TopicModifyReq payload.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'payload',
      type: 'json',
      required: true,
      desc:
        'TopicModifyReq JSON body (topicId + TopicAddDTO fields + modifyTaskList/addTaskList/delTaskIdList). Same audience rules: topicClusterKey for targetClusterType=2, topicQp for =1.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    payload: ctx.json('payload'),
  }),
});
