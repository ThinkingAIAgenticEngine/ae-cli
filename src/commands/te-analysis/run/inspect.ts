import type { Command } from '../../../framework/types.js';
import { buildCapabilityGatewayUrl, callCapabilityApi } from '../../../core/capability-api.js';

export const runInspect: Command = {
  service: 'analysis',
  resource: 'run',
  command: 'inspect',
  description: 'Inspect an analysis capability-gateway async run by run_id.',
  flags: [
    { name: 'run-id', type: 'string', required: true, desc: 'Async run ID returned by an export capability.' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildCapabilityGatewayUrl(
      ctx.host(),
      'analysis',
      `runs/${encodeURIComponent(ctx.str('run-id'))}`,
    ),
  }),
  execute: async (ctx) => callCapabilityApi(
    ctx.host(),
    'analysis',
    `runs/${encodeURIComponent(ctx.str('run-id'))}`,
    'GET',
  ),
};
