import type { Flag } from '../../../../framework/types.js';
import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

const runIdFlag: Flag = {
  name: 'run-id',
  type: 'string',
  required: false,
  desc: 'Optional run_id filter.',
};

const limitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  min: 1,
  max: 500,
  desc: 'Maximum rows returned. Default: 100.',
};

export const metadataGovernanceRecommendationDecisions = createAnalysisMetaCapabilityCommand({
  resource: 'governance-recommendation',
  command: 'decisions',
  capabilityId: 'metadata.governance_recommendation.decisions',
  description: 'List recent CLI Agent recommendation approval decisions.',
  flags: [projectIdFlag, runIdFlag, limitFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    run_id: optionalString(ctx, 'run-id'),
    limit: optionalNumber(ctx, 'limit'),
  }),
});
