import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError, PermissionError } from '../../core/errors.js';
import { putToMainApp, TeAgentApiError } from '../../core/te-agent-client.js';
import {
  assertCliChannelPath,
  createCliChannelCommand,
  encodeId,
  optionalString,
  requireJsonArray,
  unwrapCliChannelResponse,
  withQuery,
} from './shared.js';

type BatchBinding = {
  te_user_id: string;
  open_id: string;
  union_id?: string;
  agent_id?: string;
};

type BatchBindingPlan = {
  channelId: string;
  endpointId?: string;
  privateOnly: boolean;
  defaultAgentId?: string;
  bindings: BatchBinding[];
};

type BatchDependencies = {
  put(path: string, body: unknown, host?: string): Promise<unknown>;
};

const BATCH_BINDING_KEYS = new Set(['te_user_id', 'open_id', 'union_id', 'agent_id']);

function requiredBatchString(
  item: Record<string, unknown>,
  key: keyof BatchBinding,
  index: number,
): string {
  const value = item[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new CliValidationError(`--bindings[${index}].${key} is required`);
  }
  return value.trim();
}

function optionalBatchString(
  item: Record<string, unknown>,
  key: 'union_id' | 'agent_id',
  index: number,
): string | undefined {
  if (item[key] === undefined) return undefined;
  return requiredBatchString(item, key, index);
}

function batchBindingPlan(ctx: RuntimeContext): BatchBindingPlan {
  const input = requireJsonArray(ctx, 'bindings');
  if (input.length < 1 || input.length > 100) {
    throw new CliValidationError('--bindings must contain between 1 and 100 items');
  }
  const endpointId = optionalString(ctx, 'endpoint-id');
  const privateOnly = ctx.bool('private-only');
  if (privateOnly && endpointId) {
    throw new CliValidationError('--private-only cannot be combined with --endpoint-id');
  }
  if (!privateOnly && !endpointId) {
    throw new CliValidationError('--endpoint-id is required unless --private-only is true');
  }
  const bindings = input.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new CliValidationError(`--bindings[${index}] must be a JSON object`);
    }
    const item = raw as Record<string, unknown>;
    const unknownKey = Object.keys(item).find((key) => !BATCH_BINDING_KEYS.has(key));
    if (unknownKey) {
      throw new CliValidationError(`--bindings[${index}].${unknownKey} is not supported`);
    }
    const unionId = optionalBatchString(item, 'union_id', index);
    if (privateOnly && unionId) {
      throw new CliValidationError(
        `--bindings[${index}].union_id is not allowed with --private-only`,
      );
    }
    if (!privateOnly && !unionId) {
      throw new CliValidationError(
        `--bindings[${index}].union_id is required unless --private-only is true`,
      );
    }
    const agentId = optionalBatchString(item, 'agent_id', index);
    return {
      te_user_id: requiredBatchString(item, 'te_user_id', index),
      open_id: requiredBatchString(item, 'open_id', index),
      ...(unionId ? { union_id: unionId } : {}),
      ...(agentId ? { agent_id: agentId } : {}),
    };
  });
  const defaultAgentId = optionalString(ctx, 'default-agent-id');
  return {
    channelId: ctx.str('channel-id'),
    ...(endpointId ? { endpointId } : {}),
    privateOnly,
    ...(defaultAgentId ? { defaultAgentId } : {}),
    bindings,
  };
}

function batchDryRunBody(plan: BatchBindingPlan): Record<string, unknown> {
  return {
    channel_id: plan.channelId,
    ...(plan.endpointId ? { endpoint_id: plan.endpointId } : {}),
    private_only: plan.privateOnly,
    ...(plan.defaultAgentId ? { default_agent_id: plan.defaultAgentId } : {}),
    bindings: plan.bindings.map((binding) => ({
      ...binding,
      ...(binding.agent_id || plan.defaultAgentId
        ? { agent_id: binding.agent_id ?? plan.defaultAgentId }
        : {}),
    })),
  };
}

function batchError(error: unknown): Record<string, unknown> {
  const value = error && typeof error === 'object'
    ? error as { message?: unknown; code?: unknown; status?: unknown }
    : {};
  return {
    message: typeof value.message === 'string' ? value.message : String(error),
    ...(typeof value.code === 'string' ? { code: value.code } : {}),
    ...(typeof value.status === 'number' ? { status: value.status } : {}),
  };
}

function feishuBindingBody(ctx: RuntimeContext): Record<string, unknown> {
  const unionId = optionalString(ctx, 'union-id');
  const endpointId = optionalString(ctx, 'endpoint-id');
  const privateOnly = ctx.bool('private-only');
  if (privateOnly && (unionId || endpointId)) {
    throw new CliValidationError(
      '--private-only cannot be combined with --union-id or --endpoint-id',
    );
  }
  if (!privateOnly && (!unionId || !endpointId)) {
    throw new CliValidationError(
      '--union-id and --endpoint-id are required unless --private-only is true',
    );
  }
  return {
    channel_id: ctx.str('channel-id'),
    te_user_id: ctx.str('te-user-id'),
    open_id: ctx.str('open-id'),
    ...(unionId && endpointId ? { union_id: unionId, endpoint_id: endpointId } : {}),
  };
}

export const listChannelBindings = createCliChannelCommand({
  resource: 'channel binding',
  command: 'list',
  description: 'List channel user bindings',
  flags: [
    { name: 'channel-id', type: 'string', desc: 'Filter by channel ID' },
    { name: 'te-user-id', type: 'string', desc: 'Filter by AE user ID' },
    { name: 'open-id', type: 'string', desc: 'Filter by channel open ID' },
  ],
  risk: 'read',
  prepare: (ctx) => ({
    method: 'GET',
    path: withQuery('/api/cli/channel/v1/bindings', {
      channel_id: optionalString(ctx, 'channel-id'),
      te_user_id: optionalString(ctx, 'te-user-id'),
      open_id: optionalString(ctx, 'open-id'),
    }),
  }),
});

export const bindFeishuUser = createCliChannelCommand({
  resource: 'channel binding',
  command: 'bind-feishu',
  description: 'Bind one Feishu user to a managed Feishu channel',
  flags: [
    { name: 'channel-id', type: 'string', required: true, desc: 'Feishu channel ID' },
    { name: 'te-user-id', type: 'string', required: true, desc: 'AE user ID to bind' },
    { name: 'open-id', type: 'string', required: true, desc: 'Feishu open_id' },
    { name: 'union-id', type: 'string', desc: 'Feishu union_id for group chat readiness' },
    { name: 'endpoint-id', type: 'string', desc: 'Verified Feishu endpoint ID' },
    {
      name: 'private-only',
      type: 'boolean',
      default: false,
      desc: 'Create a private-chat-only binding without union_id or endpoint_id',
    },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PUT',
    path: '/api/cli/channel/v1/bindings/feishu',
    body: feishuBindingBody(ctx),
  }),
});

export function createBindFeishuUsersCommand(
  dependencies: BatchDependencies = { put: putToMainApp },
): Command {
  return {
    service: 'system',
    command: '+bind-feishu-users',
    description: 'Bind 1 to 100 Feishu users and optionally assign default Agents',
    flags: [
      { name: 'channel-id', type: 'string', required: true, desc: 'Feishu channel ID' },
      {
        name: 'endpoint-id',
        type: 'string',
        desc: 'Verified Feishu endpoint ID shared by all group-ready bindings',
      },
      {
        name: 'bindings',
        type: 'string',
        required: true,
        sensitive: true,
        desc: 'Array of 1 to 100 binding objects as JSON, @file, or stdin (-)',
      },
      {
        name: 'default-agent-id',
        type: 'string',
        desc: 'Agent ID used when a binding does not provide agent_id',
      },
      {
        name: 'private-only',
        type: 'boolean',
        default: false,
        desc: 'Create private-chat-only bindings without union_id or endpoint_id',
      },
    ],
    risk: 'write',
    dryRun: (ctx) => ({
      method: 'PUT',
      url: '/api/cli/channel/v1/bindings/feishu',
      body: batchDryRunBody(batchBindingPlan(ctx)),
    }),
    execute: async (ctx) => {
      const plan = batchBindingPlan(ctx);
      const host = ctx.host();
      const results: Array<Record<string, unknown>> = [];
      for (const [index, binding] of plan.bindings.entries()) {
        let bindingId: string | undefined;
        try {
          const path = '/api/cli/channel/v1/bindings/feishu';
          assertCliChannelPath(path);
          const raw = await dependencies.put(
            path,
            {
              channel_id: plan.channelId,
              te_user_id: binding.te_user_id,
              open_id: binding.open_id,
              ...(binding.union_id && plan.endpointId
                ? { union_id: binding.union_id, endpoint_id: plan.endpointId }
                : {}),
            },
            host,
          );
          const created = unwrapCliChannelResponse(raw) as Record<string, unknown>;
          if (typeof created?.binding_id !== 'string' || !created.binding_id) {
            throw new Error('Feishu binding response did not include binding_id');
          }
          bindingId = created.binding_id;
          const agentId = binding.agent_id ?? plan.defaultAgentId;
          if (agentId) {
            const agentPath = `/api/cli/channel/v1/bindings/${encodeId(bindingId)}/agent`;
            assertCliChannelPath(agentPath);
            await dependencies.put(agentPath, { agent_id: agentId }, host);
          }
          results.push({
            index,
            te_user_id: binding.te_user_id,
            status: 'succeeded',
            binding_id: bindingId,
            group_routing_ready: created.group_routing_ready === true,
            ...(agentId ? { agent_id: agentId } : {}),
          });
        } catch (error) {
          if (
            error instanceof PermissionError
            || (error instanceof TeAgentApiError && error.status === 401)
          ) {
            throw error;
          }
          results.push({
            index,
            te_user_id: binding.te_user_id,
            status: 'failed',
            stage: bindingId ? 'agent_assignment' : 'binding',
            ...(bindingId ? { binding_id: bindingId } : {}),
            error: batchError(error),
          });
        }
      }
      const succeeded = results.filter((result) => result.status === 'succeeded').length;
      return {
        total: results.length,
        succeeded,
        failed: results.length - succeeded,
        results,
      };
    },
  };
}

export const bindFeishuUsers = createBindFeishuUsersCommand();

export const unbindChannelUser = createCliChannelCommand({
  resource: 'channel binding',
  command: 'unbind',
  description: 'Delete one channel user binding',
  flags: [
    { name: 'binding-id', type: 'string', required: true, desc: 'Binding ID' },
  ],
  risk: 'high-risk-write',
  prepare: (ctx) => ({
    method: 'DELETE',
    path: `/api/cli/channel/v1/bindings/${encodeId(ctx.str('binding-id'))}`,
  }),
});

export const setChannelUserAgent = createCliChannelCommand({
  resource: 'channel binding',
  command: 'set-agent',
  description: 'Set the private-chat default Agent for one channel user binding',
  flags: [
    { name: 'binding-id', type: 'string', required: true, desc: 'Binding ID' },
    { name: 'agent-id', type: 'string', desc: 'Agent ID to assign' },
    {
      name: 'clear',
      type: 'boolean',
      default: false,
      desc: 'Clear the binding Agent and restore system-default resolution',
    },
  ],
  risk: 'write',
  prepare: (ctx) => {
    const agentId = optionalString(ctx, 'agent-id');
    const clear = ctx.bool('clear');
    if (Boolean(agentId) === clear) {
      throw new CliValidationError('Pass exactly one of --agent-id or --clear');
    }
    return {
      method: 'PUT',
      path: `/api/cli/channel/v1/bindings/${encodeId(ctx.str('binding-id'))}/agent`,
      body: { agent_id: clear ? null : agentId },
    };
  },
});

export const channelBindingCommands: Command[] = [
  listChannelBindings,
  bindFeishuUser,
  bindFeishuUsers,
  unbindChannelUser,
  setChannelUserAgent,
];
