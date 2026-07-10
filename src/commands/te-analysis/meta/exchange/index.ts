import type { Command } from '../../../../framework/types.js';
import { metadataExchangeConfigUpdate } from './config-update.js';
import { metadataExchangeRuleList } from './rule-list.js';
import { metadataExchangeRuleValidate } from './rule-validate.js';
import { metadataExchangeRuleUpdate } from './rule-update.js';
import { metadataExchangeRateRefresh } from './rate-refresh.js';

const commands: Command[] = [
  metadataExchangeConfigUpdate,
  metadataExchangeRuleList,
  metadataExchangeRuleValidate,
  metadataExchangeRuleUpdate,
  metadataExchangeRateRefresh,
];

export default commands;
export { metadataExchangeConfigUpdate };
export { metadataExchangeRuleList };
export { metadataExchangeRuleValidate };
export { metadataExchangeRuleUpdate };
export { metadataExchangeRateRefresh };
