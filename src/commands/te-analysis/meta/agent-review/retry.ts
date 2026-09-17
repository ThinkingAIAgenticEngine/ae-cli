import { createAnalysisMetaCapabilityCommand } from '../../capability-shared.js';
import { array, batchFlag, batchInput, clientRequestFlag, decimalId, projectFlag, text, unique } from './shared.js';

export const agentReviewRetry = createAnalysisMetaCapabilityCommand({
  resource: 'agent-review', command: 'retry', capabilityId: 'metadata.agent_review.retry',
  description: 'Retry selected failed executions under their existing approvals.', risk: 'write',
  flags: [projectFlag, batchFlag, clientRequestFlag,
    { name: 'item-ids', type: 'json', required: true, desc: '1 to 5000 failed item IDs as decimal strings. Successful items must not be retried.' }],
  buildInput: (ctx) => {
    const ids = array(ctx.json('item-ids'), '--item-ids').map((id) => decimalId(id, 'item_ids[]'));
    unique(ids, 'item_ids');
    return { ...batchInput(ctx), client_request_id: text(ctx, 'client-request-id'), item_ids: ids };
  },
});
