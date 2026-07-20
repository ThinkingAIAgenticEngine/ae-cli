import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Batch updates channel touch-limit rules, setting each rule's enable flag and replacing its rule definition. */
export const channelTouchLimitsBatchUpdate = createEngageSettingCapabilityCommand({
  resource: 'channel-touch-limits',
  command: 'batch-update',
  capabilityId: 'engage-setting.channel-touch-limits.batch-update',
  description: 'Batch update channel touch-limit rules, setting each rule\'s enable flag and replacing its rule definition.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'items',
      type: 'json',
      required: true,
      desc: "JSON array of rule updates, e.g. '[{\"rule_id\":\"r1\",\"enable\":true,\"rule_def\":\"[]\"}]'.",
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    items: ctx.json('items'),
  }),
});
