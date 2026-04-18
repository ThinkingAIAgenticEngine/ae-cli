import type { Command } from '../../../framework/types.js';
import { queryEntityDetails } from './query-entity-details.js';
import { queryEventDetails } from './query-event-details.js';
import { buildEntityDetailsSql } from './build-entity-details-sql.js';
import { buildEventDetailsSql } from './build-event-details-sql.js';

const commands: Command[] = [
  queryEntityDetails,
  queryEventDetails,
  buildEntityDetailsSql,
  buildEventDetailsSql,
];

export default commands;
export { queryEntityDetails };
export { queryEventDetails };
export { buildEntityDetailsSql };
export { buildEventDetailsSql };
