import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import {
  createCliChannelCommand,
  encodeId,
  requireJsonObject,
} from './shared.js';

const CHANNEL_TYPES = new Set([
  'feishu',
  'lark',
  'slack',
  'discord',
  'dingtalk',
  'wecom',
  'mattermost',
  'google_chat',
  'whatsapp',
]);

const REQUIRED_CONFIG_KEYS: Record<string, readonly string[]> = {
  feishu: ['app_id', 'app_secret'],
  lark: ['app_id', 'app_secret'],
  slack: ['bot_token', 'app_token'],
  discord: ['bot_token'],
  dingtalk: ['client_id', 'client_secret', 'corp_id'],
  wecom: ['bot_id', 'bot_secret'],
  mattermost: ['server_url', 'bot_token'],
  google_chat: ['service_account_json'],
  whatsapp: [],
};

const OAUTH_REQUIRED_CONFIG_KEYS: Record<string, readonly string[]> = {
  wecom: ['corp_id', 'corp_secret', 'agent_id'],
  mattermost: ['client_id', 'client_secret'],
  google_chat: ['client_id', 'client_secret'],
};

const CONFIG_KEY_ALIASES: Record<string, string> = {
  appId: 'app_id',
  appSecret: 'app_secret',
  botToken: 'bot_token',
  appToken: 'app_token',
  clientId: 'client_id',
  clientSecret: 'client_secret',
  corpId: 'corp_id',
  corpSecret: 'corp_secret',
  botId: 'bot_id',
  botSecret: 'bot_secret',
  agentId: 'agent_id',
  oauthEnabled: 'oauth_enabled',
  interactionCardTemplateId: 'interaction_card_template_id',
  serverUrl: 'server_url',
  serviceAccountJson: 'service_account_json',
  workspaceAddonServiceAccountEmail: 'workspace_addon_service_account_email',
};

function normalizeKeys(
  value: Record<string, unknown>,
  aliases: Record<string, string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [aliases[key] ?? key, item]),
  );
}

function normalizeChannelBody(channel: Record<string, unknown>): Record<string, unknown> {
  const normalized = normalizeKeys(channel, {
    systemPrompt: 'system_prompt',
    unbindUsers: 'unbind_users',
  });
  if (normalized.config && typeof normalized.config === 'object' && !Array.isArray(normalized.config)) {
    normalized.config = normalizeKeys(
      normalized.config as Record<string, unknown>,
      CONFIG_KEY_ALIASES,
    );
  }
  return normalized;
}

function createChannelBody(ctx: RuntimeContext): Record<string, unknown> {
  const channel = normalizeChannelBody(requireJsonObject(ctx, 'channel'));
  if (typeof channel.name !== 'string' || !channel.name.trim()) {
    throw new CliValidationError('--channel.name is required');
  }
  if (typeof channel.type !== 'string' || !CHANNEL_TYPES.has(channel.type)) {
    throw new CliValidationError(
      `--channel.type must be one of: ${Array.from(CHANNEL_TYPES).join(', ')}`,
    );
  }
  if (channel.config === undefined && channel.type === 'whatsapp') {
    channel.config = {};
  }
  if (!channel.config || typeof channel.config !== 'object' || Array.isArray(channel.config)) {
    throw new CliValidationError('--channel.config must be a JSON object');
  }
  const config = channel.config as Record<string, unknown>;
  for (const key of REQUIRED_CONFIG_KEYS[channel.type as string] ?? []) {
    if (typeof config[key] !== 'string' || !(config[key] as string).trim()) {
      throw new CliValidationError(`--channel.config.${key} is required for ${channel.type}`);
    }
  }
  if (config.oauth_enabled === true) {
    for (const key of OAUTH_REQUIRED_CONFIG_KEYS[channel.type as string] ?? []) {
      if (typeof config[key] !== 'string' || !(config[key] as string).trim()) {
        throw new CliValidationError(
          `--channel.config.${key} is required when oauth_enabled is true for ${channel.type}`,
        );
      }
    }
  }
  return channel;
}

function updateChannelBody(ctx: RuntimeContext): Record<string, unknown> {
  const channel = normalizeChannelBody(requireJsonObject(ctx, 'channel'));
  if (Object.keys(channel).length === 0) {
    throw new CliValidationError('--channel must contain at least one update field');
  }
  if (
    channel.type !== undefined
    && (typeof channel.type !== 'string' || !CHANNEL_TYPES.has(channel.type))
  ) {
    throw new CliValidationError(
      `--channel.type must be one of: ${Array.from(CHANNEL_TYPES).join(', ')}`,
    );
  }
  return channel;
}

export const listChannels = createCliChannelCommand({
  command: '+list-channels',
  description: 'List configured channels',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/cli/channel/v1/channels' }),
});

export const getChannel = createCliChannelCommand({
  resource: 'channel',
  command: 'get',
  description: 'Get one configured channel',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Channel ID from +list-channels' },
  ],
  risk: 'read',
  prepare: (ctx) => ({
    method: 'GET',
    path: `/api/cli/channel/v1/channels/${encodeId(ctx.str('id'))}`,
  }),
});

export const createChannel = createCliChannelCommand({
  command: '+create-channel',
  description: 'Create a managed channel',
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
    path: '/api/cli/channel/v1/channels',
    body: createChannelBody(ctx),
  }),
});

export const updateChannel = createCliChannelCommand({
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
    method: 'PATCH',
    path: `/api/cli/channel/v1/channels/${encodeId(ctx.str('id'))}`,
    body: updateChannelBody(ctx),
  }),
});

export const removeChannel = createCliChannelCommand({
  command: '+remove-channel',
  description: 'Delete a channel, unbind its users, and stop its runtime connection',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Channel ID from +list-channels' },
  ],
  risk: 'high-risk-write',
  prepare: (ctx) => ({
    method: 'DELETE',
    path: `/api/cli/channel/v1/channels/${encodeId(ctx.str('id'))}`,
  }),
});

export const verifyChannel = createCliChannelCommand({
  resource: 'channel',
  command: 'verify',
  description: 'Verify channel credentials and discover endpoints',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Channel ID from +list-channels' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'POST',
    path: `/api/cli/channel/v1/channels/${encodeId(ctx.str('id'))}/verify`,
  }),
});

export const channelCommands: Command[] = [
  listChannels,
  getChannel,
  createChannel,
  updateChannel,
  removeChannel,
  verifyChannel,
];
