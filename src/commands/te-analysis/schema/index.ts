import type { Command } from '../../../framework/types.js';
import { getAnalysisQuerySchema } from './get-analysis-query-schema.js';
import { getFilterSchema } from './get-filter-schema.js';
import { getGroupbySchema } from './get-groupby-schema.js';

const commands: Command[] = [
  getAnalysisQuerySchema,
  getFilterSchema,
  getGroupbySchema,
];

export default commands;
export { getAnalysisQuerySchema };
export { getFilterSchema };
export { getGroupbySchema };
