import type { Command } from '../../../../framework/types.js';
import { metadataVirtualPropertyCreate } from './create.js';
import { metadataVirtualPropertySqlRuleUpdate } from './sql-rule-update.js';
import { metadataVirtualPropertySqlRuleDelete } from './sql-rule-delete.js';

const commands: Command[] = [
  metadataVirtualPropertyCreate,
  metadataVirtualPropertySqlRuleUpdate,
  metadataVirtualPropertySqlRuleDelete,
];

export default commands;
export { metadataVirtualPropertyCreate };
export { metadataVirtualPropertySqlRuleUpdate };
export { metadataVirtualPropertySqlRuleDelete };
