import { createAnalysisMetaCapabilityCommand, projectIdFlag, projectInput } from '../../capability-shared.js';

export const metadataGovernanceRecommendationRunUpdate = createAnalysisMetaCapabilityCommand({
  resource: 'governance-recommendation',
  command: 'run-update',
  capabilityId: 'metadata.governance_recommendation.run_update',
  description: 'Renew or finish your tracked recommendation workflow; it does not cancel Agent execution.',
  risk: 'write',
  flags: [
    projectIdFlag,
    { name: 'run-id', type: 'string', required: true, desc: 'Exact run_id returned by the tracked export.' },
    { name: 'status', type: 'string', required: true, desc: 'HEARTBEAT, SUCCEEDED, FAILED or CANCELLED. Finish only after the actual workflow has ended.' },
    { name: 'reason', type: 'string', required: false, desc: 'Short non-sensitive result or failure reason; never include credentials or raw logs.' },
  ],
  buildInput: ctx => {
    const status = ctx.str('status');
    if (!['HEARTBEAT', 'SUCCEEDED', 'FAILED', 'CANCELLED'].includes(status)) {
      throw new Error('--status must be HEARTBEAT, SUCCEEDED, FAILED or CANCELLED.');
    }
    return { ...projectInput(ctx), run_id: ctx.str('run-id'), status,
      ...(ctx.str('reason') ? { reason: ctx.str('reason') } : {}) };
  },
});
