import { registerCapabilityGatewayRoute } from '../../core/capability-routing.js';
import type { Command } from '../../framework/types.js';
import { personalSemanticPreferenceAdd } from './add.js';
import { personalSemanticPreferenceDelete } from './delete.js';
import { personalSemanticPreferenceGet } from './get.js';
import { personalSemanticPreferenceList } from './list.js';
import { personalSemanticPreferenceUpdate } from './update.js';

registerCapabilityGatewayRoute('personal-semantic-preference', { gatewayDomain: 'analysis' });

const commands: Command[] = [
  personalSemanticPreferenceList,
  personalSemanticPreferenceGet,
  personalSemanticPreferenceAdd,
  personalSemanticPreferenceUpdate,
  personalSemanticPreferenceDelete,
];

export default commands;
