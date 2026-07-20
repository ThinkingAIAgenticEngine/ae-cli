import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Enables or disables a single channel touch-limit rule by its rule_id. */
export const channelTouchLimitsToggle = createEngageSettingCapabilityCommand({
  resource: 'channel-touch-limits',
  command: 'toggle',
  capabilityId: 'engage-setting.channel-touch-limits.toggle',
  description: 'Enable or disable a single channel touch-limit rule by its rule_id.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'rule-id', type: 'string', required: true, desc: 'Touch-limit rule ID to enable/disable.' },
    { name: 'enable', type: 'boolean', required: true, desc: 'Whether the touch-limit rule is enabled.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    rule_id: ctx.str('rule-id'),
    enable: ctx.bool('enable'),
  }),
});
