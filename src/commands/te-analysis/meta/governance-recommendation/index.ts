import type { Command } from '../../../../framework/types.js';
import { metadataGovernanceRecommendationExport } from './export.js';
import { metadataGovernanceRecommendationSubmit } from './submit.js';
import { metadataGovernanceRecommendationDecisions } from './decisions.js';

const commands: Command[] = [
  metadataGovernanceRecommendationExport,
  metadataGovernanceRecommendationSubmit,
  metadataGovernanceRecommendationDecisions,
];

export default commands;
export { metadataGovernanceRecommendationExport };
export { metadataGovernanceRecommendationSubmit };
export { metadataGovernanceRecommendationDecisions };
