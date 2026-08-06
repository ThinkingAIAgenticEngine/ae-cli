import type { Command } from '../../../../framework/types.js';
import {
  buildCapabilityGatewayUrl,
  requestCapabilityGatewayWithEnvelope,
} from '../../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../../core/capability-routing.js';
import { withOutputMetadata } from '../../../../framework/output.js';

/** Inspects an engagement query or export run. */
export const runInspect: Command = {
  service: 'engage-query',
  resource: 'run',
  command: 'inspect',
  description: 'Inspect one engagement query or export run status.',
  flags: [
    { name: 'run-id', type: 'string', required: true, desc: 'Query or export run ID.' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildCapabilityGatewayUrl(
      ctx.host(),
      resolveGatewayDomain('engage-query', 'engage'),
      `runs/${encodeURIComponent(ctx.str('run-id'))}`,
    ),
  }),
  execute: async (ctx) => {
    const result = await requestCapabilityGatewayWithEnvelope(
      ctx.host(),
      resolveGatewayDomain('engage-query', 'engage'),
      `runs/${encodeURIComponent(ctx.str('run-id'))}`,
    );
    return withOutputMetadata(result.data, result.meta);
  },
};
