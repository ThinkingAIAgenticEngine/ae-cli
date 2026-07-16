import type { Command } from '../../../framework/types.js';
import {
  buildCapabilityGatewayUrl,
  requestCapabilityGatewayWithEnvelope,
} from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';
import { withOutputMetadata } from '../../../framework/output.js';

export const runInspect: Command = {
  service: 'analysis',
  resource: 'run',
  command: 'inspect',
  description: 'Inspect an analysis capability-gateway async run by run_id. Use after adhoc/report-data/dashboard/BI export returns run_id.',
  flags: [
    { name: 'run-id', type: 'string', required: true, desc: 'Async run ID returned by an export capability.' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildCapabilityGatewayUrl(
      ctx.host(),
      resolveGatewayDomain('analysis'),
      `runs/${encodeURIComponent(ctx.str('run-id'))}`,
    ),
  }),
  execute: async (ctx) => {
    const result = await requestCapabilityGatewayWithEnvelope(
      ctx.host(),
      resolveGatewayDomain('analysis'),
      `runs/${encodeURIComponent(ctx.str('run-id'))}`,
    );
    return withOutputMetadata(result.data, result.meta);
  },
};
