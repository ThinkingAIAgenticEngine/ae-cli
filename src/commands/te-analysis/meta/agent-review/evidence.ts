import { createAnalysisMetaCapabilityCommand } from '../../capability-shared.js';
import { projectFlag, projectInput, text } from './shared.js';

export const agentReviewEvidence = createAnalysisMetaCapabilityCommand({
  resource: 'agent-review', command: 'evidence', capabilityId: 'metadata.agent_review.evidence',
  description: 'Read current server-generated asset review evidence before drafting a proposal. Does not submit or certify.',
  risk: 'read',
  flags: [
    projectFlag,
    { name: 'target-type', type: 'string', required: true, desc: 'Resolved asset type supported by Common, for example report or dashboard.' },
    { name: 'target-key', type: 'string', required: true, desc: 'Exact resolved asset key as a string; preserve all ID digits and technical names.' },
  ],
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    review_type: 'ASSET_GOVERNANCE',
    target_ref: { type: text(ctx, 'target-type'), key: text(ctx, 'target-key') },
    action_type: 'CERTIFY',
    proposal_payload: { authentication_status: 1 },
  }),
});

export default agentReviewEvidence;
