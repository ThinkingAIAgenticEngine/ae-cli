import type { Command } from '../../../framework/types.js';
import { getClusterDefinitionSchema } from './get-cluster-definition-schema.js';
import { getTagDefinitionSchema } from './get-tag-definition-schema.js';

const commands: Command[] = [
  getClusterDefinitionSchema,
  getTagDefinitionSchema,
];

export default commands;
