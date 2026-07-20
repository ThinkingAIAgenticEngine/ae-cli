import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Creates a new channel touch-limit rule for a channel business type, or updates an existing rule when rule_id is provided. */
export const channelTouchLimitsSave = createEngageSettingCapabilityCommand({
  resource: 'channel-touch-limits',
  command: 'save',
  capabilityId: 'engage-setting.channel-touch-limits.save',
  description: 'Create a new channel touch-limit rule for a channel business type, or update an existing rule when rule_id is provided.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-biz-type', type: 'string', required: true, desc: 'Channel business type the rule belongs to.' },
    {
      name: 'rule-def',
      type: 'string',
      required: true,
      desc: 'Touch-limit rule definition (JSON string, see ChannelTouchLimitRuleDTO).',
    },
    { name: 'enable', type: 'boolean', required: true, desc: 'Whether the touch-limit rule is enabled.' },
    { name: 'rule-id', type: 'string', required: false, desc: 'Existing rule ID. When omitted a new rule is created.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_biz_type: ctx.str('channel-biz-type'),
    rule_def: ctx.str('rule-def'),
    enable: ctx.bool('enable'),
    rule_id: ctx.str('rule-id') || undefined,
  }),
});
