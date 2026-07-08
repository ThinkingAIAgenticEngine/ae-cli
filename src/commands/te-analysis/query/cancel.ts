import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalString,
} from '../capability-shared.js';

export const queryCancel = createAnalysisCapabilityCommand({
  resource: 'query',
  command: 'cancel',
  capabilityId: 'analysis.query.cancel',
  description: 'Cancel an analysis capability-gateway query/export by run_id.',
  flags: [
    { name: 'run-id', type: 'string', required: true, desc: 'Async run ID returned by an export capability.' },
    { name: 'reason', type: 'string', required: false, desc: 'Optional cancellation reason.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    run_id: ctx.str('run-id'),
    reason: optionalString(ctx, 'reason'),
  }),
});
