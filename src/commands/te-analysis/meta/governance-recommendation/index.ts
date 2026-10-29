import { metadataGovernanceRecommendationRunUpdate } from './run-update.js';
import type { Command } from '../../../../framework/types.js';
import { metadataGovernanceRecommendationExport } from './export.js';
import { metadataGovernanceRecommendationSubmit } from './submit.js';
import { metadataGovernanceRecommendationAutoReview } from './auto-review.js';
import { metadataGovernanceRecommendationDecisions } from './decisions.js';

const commands: Command[] = [
  metadataGovernanceRecommendationRunUpdate,
  metadataGovernanceRecommendationExport,
  metadataGovernanceRecommendationSubmit,
  metadataGovernanceRecommendationAutoReview,
  metadataGovernanceRecommendationDecisions,
];

export default commands;
export { metadataGovernanceRecommendationRunUpdate };
export { metadataGovernanceRecommendationExport };
export { metadataGovernanceRecommendationSubmit };
export { metadataGovernanceRecommendationAutoReview };
export { metadataGovernanceRecommendationDecisions };
