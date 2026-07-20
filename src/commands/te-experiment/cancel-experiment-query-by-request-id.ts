import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return { requestId: ctx.str('request_id') };
}

export const cancelExperimentQueryByRequestId = createExperimentCommand({
  command: '+cancel_experiment_query_by_request_id',
  description: 'Cancel a running experiment report query by request ID.',
  flags: [
    { name: 'request_id', type: 'string', required: true, desc: 'Request ID to cancel' },
  ],
  risk: 'write',
  buildArgs,
});
