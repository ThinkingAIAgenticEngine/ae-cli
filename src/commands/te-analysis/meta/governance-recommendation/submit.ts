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
  required: true,
  desc: 'run_id returned by governance-recommendation export.',
};

const snapshotHashFlag: Flag = {
  name: 'snapshot-hash',
  type: 'string',
  required: false,
  desc: 'Authentication snapshot hash returned by governance-recommendation export.',
};

const topicIdFlag: Flag = {
  name: 'topic-id',
  type: 'string',
  required: false,
  desc: 'Optional CLI Agent business-domain ID. Dashboard-seeded evidence may submit only topic-name.',
};

const topicNameFlag: Flag = {
  name: 'topic-name',
  type: 'string',
  required: true,
  desc: 'CLI Agent business-domain display name.',
};

const decisionsFlag: Flag = {
  name: 'decisions',
  type: 'json',
  required: true,
  desc: 'Approval decisions JSON array for one CLI Agent topic. Each item uses item_type asset or metric_candidate and decision APPROVE, REJECT, or SKIP.',
};

const windowDaysFlag: Flag = {
  name: 'window-days',
  type: 'number',
  required: false,
  min: 1,
  max: 365,
  desc: 'Usage window in days for server-side metric candidate re-scan. Default: 90.',
};

const limitFlag: Flag = {
  name: 'limit',
  type: 'number',
  required: false,
  min: 1,
  max: 100,
  desc: 'Dashboard limit for server-side metric candidate re-scan. Default: 20.',
};

export const metadataGovernanceRecommendationSubmit = createAnalysisMetaCapabilityCommand({
  resource: 'governance-recommendation',
  command: 'submit',
  capabilityId: 'metadata.governance_recommendation.submit',
  description: 'Submit CLI Agent approval decisions for asset authentication and metric recommendation items.',
  flags: [
    projectIdFlag,
    runIdFlag,
    snapshotHashFlag,
    topicIdFlag,
    topicNameFlag,
    windowDaysFlag,
    limitFlag,
    decisionsFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    run_id: ctx.str('run-id'),
    snapshot_hash: optionalString(ctx, 'snapshot-hash'),
    topic_id: optionalString(ctx, 'topic-id'),
    topic_name: ctx.str('topic-name'),
    window_days: optionalNumber(ctx, 'window-days'),
    limit: optionalNumber(ctx, 'limit'),
    decisions: ctx.json('decisions'),
  }),
});
