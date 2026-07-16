import type { Command } from '../../../framework/types.js';
import { cancelQuery } from './cancel-query.js';
import { loadFilters } from './load-filters.js';

const commands: Command[] = [
  cancelQuery,
  loadFilters,
];

export default commands;
