import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import {
  createAdminCommand,
  encodeId,
  requireJsonObject,
} from './shared.js';

const CHANNEL_TYPES = new Set(['feishu', 'slack', 'lark']);

function createChannelBody(ctx: RuntimeContext): Record<string, unknown> {
  const channel = requireJsonObject(ctx, 'channel');
  if (typeof channel.name !== 'string' || !channel.name.trim()) {
    throw new CliValidationError('--channel.name is required');
  }
  if (typeof channel.type !== 'string' || !CHANNEL_TYPES.has(channel.type)) {
    throw new CliValidationError('--channel.type must be one of: feishu, slack, lark');
  }
  if (!channel.config || typeof channel.config !== 'object' || Array.isArray(channel.config)) {
    throw new CliValidationError('--channel.config must be a JSON object');
  }
  const config = channel.config as Record<string, unknown>;
  const requiredConfigKeys =
    channel.type === 'slack' ? ['botToken', 'appToken'] : ['appId', 'appSecret'];
  for (const key of requiredConfigKeys) {
    if (typeof config[key] !== 'string' || !(config[key] as string).trim()) {
      throw new CliValidationError(`--channel.config.${key} is required for ${channel.type}`);
    }
  }
  return channel;
}

function updateChannelBody(ctx: RuntimeContext): Record<string, unknown> {
  const channel = requireJsonObject(ctx, 'channel');
  if (Object.keys(channel).length === 0) {
    throw new CliValidationError('--channel must contain at least one update field');
  }
  if ('type' in channel) {
    throw new CliValidationError('--channel.type cannot be changed after channel creation');
  }
  return channel;
}

export const listChannels = createAdminCommand({
  command: '+list-channels',
  description: 'List configured Feishu, Lark, and Slack channels',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/channels' }),
});

export const createChannel = createAdminCommand({
  command: '+create-channel',
  description: 'Create a Feishu, Lark, or Slack channel',
  flags: [
    {
      name: 'channel',
      type: 'string',
      required: true,
      sensitive: true,
      desc: 'Channel JSON object, @file, or stdin (-); may contain credentials',
    },
  ],
  risk: 'write',
  redactDryRun: true,
  prepare: (ctx) => ({
    method: 'POST',
    path: '/api/admin/channels',
    body: createChannelBody(ctx),
  }),
});

export const updateChannel = createAdminCommand({
  command: '+update-channel',
  description: 'Update channel settings, credentials, model, prompt, or enabled state',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Channel ID from +list-channels' },
    {
      name: 'channel',
      type: 'string',
      required: true,
      sensitive: true,
      desc: 'Partial channel JSON object, @file, or stdin (-); may contain credentials',
    },
  ],
  risk: 'write',
  redactDryRun: true,
  prepare: (ctx) => ({
    method: 'PUT',
    path: `/api/admin/channels/${encodeId(ctx.str('id'))}`,
    body: updateChannelBody(ctx),
  }),
});

export const removeChannel = createAdminCommand({
  command: '+remove-channel',
  description: 'Delete a channel, unbind its users, and stop its runtime connection',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Channel ID from +list-channels' },
  ],
  risk: 'high-risk-write',
  prepare: (ctx) => ({
    method: 'DELETE',
    path: `/api/admin/channels/${encodeId(ctx.str('id'))}`,
  }),
});

export const channelCommands: Command[] = [
  listChannels,
  createChannel,
  updateChannel,
  removeChannel,
];
