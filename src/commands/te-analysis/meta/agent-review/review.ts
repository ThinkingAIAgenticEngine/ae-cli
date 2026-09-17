import { createAnalysisMetaCapabilityCommand } from '../../capability-shared.js';
import { array, batchFlag, batchInput, clientRequestFlag, decimalId, fields, object, projectFlag, text, unique } from './shared.js';

export const agentReviewReview = createAnalysisMetaCapabilityCommand({
  resource: 'agent-review', command: 'review', capabilityId: 'metadata.agent_review.review',
  description: 'Record explicit human decisions and execute approved certification proposals.',
  risk: 'write',
  flags: [projectFlag, batchFlag, clientRequestFlag,
    { name: 'decisions', type: 'json', required: true, desc: 'Versioned decisions: item_id (string), version (integer), decision APPROVE/DEFER/REJECT, reason (required for DEFER/REJECT).' }],
  buildInput: (ctx) => {
    const decisions = array(ctx.json('decisions'), '--decisions').map((value) => {
      const decision = object(value, 'decisions[]');
      fields(decision, ['item_id', 'version', 'decision', 'reason'], 'decisions[]');
      decimalId(decision.item_id, 'decisions[].item_id');
      if (!Number.isSafeInteger(decision.version) || Number(decision.version) < 0) {
        throw new Error('decisions[].version must be a nonnegative safe integer from detail.');
      }
      if (!['APPROVE', 'DEFER', 'REJECT'].includes(String(decision.decision))) {
        throw new Error('decisions[].decision must be APPROVE, DEFER, or REJECT.');
      }
      if (decision.reason !== undefined && typeof decision.reason !== 'string') {
        throw new Error('decisions[].reason must be a string.');
      }
      if (decision.decision !== 'APPROVE' && !String(decision.reason ?? '').trim()) {
        throw new Error('DEFER and REJECT require a nonempty reason.');
      }
      return decision;
    });
    unique(decisions.map((decision) => decision.item_id), 'decisions[].item_id');
    return { ...batchInput(ctx), client_request_id: text(ctx, 'client-request-id'), decisions };
  },
});
