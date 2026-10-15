import { registerCapabilityGatewayRoute } from '../../core/capability-routing.js';
import type { Command } from '../../framework/types.js';
import { personalSemanticPreferenceAdd } from './add.js';
import { personalSemanticPreferenceDelete } from './delete.js';
import { personalSemanticPreferenceGet } from './get.js';
import { personalSemanticPreferenceList } from './list.js';
import { personalSemanticPreferenceReviewList } from './review-list.js';
import { personalSemanticPreferenceReview } from './review.js';
import { personalSemanticPreferenceSubmit } from './submit.js';
import { personalSemanticPreferenceUpdate } from './update.js';

registerCapabilityGatewayRoute('personal-semantic-preference', {
  gatewayDomain: 'analysis',
  capabilityPrefixes: ['business_semantics.personal_context'],
});

const commands: Command[] = [
  personalSemanticPreferenceList,
  personalSemanticPreferenceGet,
  personalSemanticPreferenceAdd,
  personalSemanticPreferenceUpdate,
  personalSemanticPreferenceDelete,
  personalSemanticPreferenceSubmit,
  personalSemanticPreferenceReviewList,
  personalSemanticPreferenceReview,
];

export default commands;
