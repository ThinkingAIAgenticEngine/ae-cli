import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Updates an existing channel's name, push-id field, channel-specific config, and reach-funnel (touch-event) settings. */
export const channelUpdateConfig = createEngageSettingCapabilityCommand({
  resource: 'channel',
  command: 'update-config',
  capabilityId: 'engage-setting.channel.update-config',
  description: "Update an existing channel's name, push-id field, channel-specific config, and reach-funnel (touch-event) settings.",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'channel-id', type: 'string', required: true, desc: 'Channel ID to update.' },
    { name: 'channel-name', type: 'string', required: false, desc: 'New channel name.' },
    { name: 'push-id-type', type: 'string', required: false, desc: 'User property used as the push ID.' },
    { name: 'config', type: 'string', required: false, desc: 'Channel-specific JSON config string (see ChannelConfigDTO).' },
    { name: 'enable-touch-event', type: 'number', required: true, desc: 'Reach funnel toggle: 1 enabled, 0 disabled.' },
    { name: 'touch-event-source', type: 'string', required: false, desc: 'Reach event source.' },
    { name: 'event-delivery-name', type: 'string', required: false, desc: 'Actual delivery event name.' },
    { name: 'event-click-name', type: 'string', required: false, desc: 'Click event name.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    channel_id: ctx.str('channel-id'),
    channel_name: ctx.str('channel-name') || undefined,
    push_id_type: ctx.str('push-id-type') || undefined,
    config: ctx.str('config') || undefined,
    enable_touch_event: ctx.num('enable-touch-event'),
    touch_event_source: ctx.str('touch-event-source') || undefined,
    event_delivery_name: ctx.str('event-delivery-name') || undefined,
    event_click_name: ctx.str('event-click-name') || undefined,
  }),
});
