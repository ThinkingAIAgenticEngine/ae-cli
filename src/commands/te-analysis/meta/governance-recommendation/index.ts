import type { Command } from '../../../../framework/types.js';
import { metadataGovernanceRecommendationExport } from './export.js';
import { metadataGovernanceRecommendationSubmit } from './submit.js';
import { metadataGovernanceRecommendationAutoReview } from './auto-review.js';
import { metadataGovernanceRecommendationDecisions } from './decisions.js';

const commands: Command[] = [
  metadataGovernanceRecommendationExport,
  metadataGovernanceRecommendationSubmit,
  metadataGovernanceRecommendationAutoReview,
  metadataGovernanceRecommendationDecisions,
];

export default commands;
export { metadataGovernanceRecommendationExport };
export { metadataGovernanceRecommendationSubmit };
export { metadataGovernanceRecommendationAutoReview };
export { metadataGovernanceRecommendationDecisions };
