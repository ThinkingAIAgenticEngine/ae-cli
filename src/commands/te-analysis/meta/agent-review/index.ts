import { createAnalysisMetaCapabilityCommand } from '../../capability-shared.js';
import { batchFlag, batchInput, projectFlag, projectInput } from './shared.js';
import { agentReviewSubmitToPage } from './submit-to-page.js';
import { agentReviewReview } from './review.js';
import { agentReviewRetry } from './retry.js';
import { agentReviewEvidence } from './evidence.js';

export const agentReviewList = createAnalysisMetaCapabilityCommand({
  resource: 'agent-review', command: 'list', capabilityId: 'metadata.agent_review.list',
  description: 'List recent visible review batches and their current status.', risk: 'read',
  flags: [projectFlag, { name: 'limit', type: 'number', min: 1, max: 500, default: 20, desc: 'Maximum recent batches, from 1 to 500. Default: 20.' }],
  buildInput: (ctx) => {
    const limit = ctx.str('limit') === '' ? 20 : ctx.num('limit');
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('--limit must be an integer from 1 to 500.');
    return { ...projectInput(ctx), limit };
  },
});
export const agentReviewDetail = createAnalysisMetaCapabilityCommand({
  resource: 'agent-review', command: 'detail', capabilityId: 'metadata.agent_review.detail',
  description: 'Read review snapshots, item versions, decisions, and execution status.', risk: 'read',
  flags: [projectFlag, batchFlag], buildInput: batchInput,
});
export const agentReviewRecords = createAnalysisMetaCapabilityCommand({
  resource: 'agent-review', command: 'records', capabilityId: 'metadata.agent_review.records',
  description: 'Read immutable review and execution events for a batch.', risk: 'read',
  flags: [projectFlag, batchFlag], buildInput: batchInput,
});

export { agentReviewSubmitToPage, agentReviewReview, agentReviewRetry, agentReviewEvidence };
export default [agentReviewSubmitToPage, agentReviewList, agentReviewDetail, agentReviewRecords, agentReviewReview, agentReviewRetry, agentReviewEvidence];
