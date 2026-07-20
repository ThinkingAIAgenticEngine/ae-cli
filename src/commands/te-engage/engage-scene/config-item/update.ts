import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Updates a config item's basic info and bound channel. */
export const configItemUpdate = createEngageSceneCapabilityCommand({
  resource: 'config-item',
  command: 'update',
  capabilityId: 'engage-scene.config-item.update',
  description: 'Update a config item\'s basic info (name, remark, business type, group) and bound channel.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID to update.' },
    { name: 'config-name', type: 'string', required: false, desc: 'New config item display name (<=80 chars).' },
    { name: 'config-remark', type: 'string', required: false, desc: 'New config item remark (<=200 chars).' },
    { name: 'business-type', type: 'string', required: false, desc: 'New business type: config_file or params.' },
    { name: 'group-id', type: 'number', required: false, desc: 'New group ID (0 = default group).' },
    { name: 'channel-id', type: 'string', required: false, desc: 'Config channel ID to bind.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    config_name: ctx.str('config-name') || undefined,
    config_remark: ctx.str('config-remark') || undefined,
    business_type: ctx.str('business-type') || undefined,
    group_id: ctx.optionalNum('group-id'),
    channel_id: ctx.str('channel-id') || undefined,
  }),
});
