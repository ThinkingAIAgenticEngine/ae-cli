import { createEngageSettingCapabilityCommand } from '../../shared.js';
import { readRequiredJsonObject } from '../../utils.js';

/** Creates a channel. */
export const channelCreate = createEngageSettingCapabilityCommand({
  resource: 'channel',
  command: 'create',
  capabilityId: 'engage-setting.channel.create',
  description: 'Create a channel.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'ChannelNewDTO request JSON object.' },
  ],
  risk: 'write',
  validate: (ctx) => { readRequiredJsonObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredJsonObject(ctx, 'req') }),
});
