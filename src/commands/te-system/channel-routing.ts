import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { createCliChannelCommand, encodeId, requireJsonObject } from './shared.js';

function routingBody(ctx: RuntimeContext): Record<string, unknown> {
  const routing = requireJsonObject(ctx, 'routing');
  if (routing.status !== 'enabled' && routing.status !== 'disabled') {
    throw new CliValidationError('--routing.status must be one of: enabled, disabled');
  }
  if (!('default_handler' in routing)) {
    throw new CliValidationError('--routing.default_handler is required and may be null');
  }
  if (!Array.isArray(routing.targets)) {
    throw new CliValidationError('--routing.targets must be a JSON array');
  }
  if (routing.targets.length > 19) {
    throw new CliValidationError('--routing.targets may contain at most 19 items');
  }
  return routing;
}

export const getChannelRouting = createCliChannelCommand({
  resource: 'channel routing',
  command: 'get',
  description: 'Get group message routing for one channel endpoint',
  flags: [
    {
      name: 'endpoint-id',
      type: 'string',
      required: true,
      desc: 'Endpoint ID returned by channel get or channel verify',
    },
  ],
  risk: 'read',
  prepare: (ctx) => ({
    method: 'GET',
    path: `/api/cli/channel/v1/endpoints/${encodeId(ctx.str('endpoint-id'))}/routing`,
  }),
});

export const setChannelRouting = createCliChannelCommand({
  resource: 'channel routing',
  command: 'set',
  description: 'Replace group message routing for one channel endpoint',
  flags: [
    {
      name: 'endpoint-id',
      type: 'string',
      required: true,
      desc: 'Endpoint ID returned by channel get or channel verify',
    },
    {
      name: 'routing',
      type: 'string',
      required: true,
      desc: 'Routing JSON object, @file, or stdin (-)',
    },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PUT',
    path: `/api/cli/channel/v1/endpoints/${encodeId(ctx.str('endpoint-id'))}/routing`,
    body: routingBody(ctx),
  }),
});

export const channelRoutingCommands: Command[] = [getChannelRouting, setChannelRouting];
