import { createEngageQueryCapabilityCommand } from '../../shared.js';

/** Cancels an engagement query or export run. */
export const queryCancel = createEngageQueryCapabilityCommand({
  resource: 'query',
  command: 'cancel',
  capabilityId: 'engage-query.query.cancel',
  description: 'Cancel one running engagement query or export run.',
  flags: [
    { name: 'run-id', type: 'string', required: true, desc: 'Query or export run ID.' },
    { name: 'reason', type: 'string', required: false, desc: 'Optional cancellation reason.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    run_id: ctx.str('run-id'),
    reason: ctx.str('reason') || undefined,
  }),
});
