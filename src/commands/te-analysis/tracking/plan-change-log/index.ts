import type { Command } from '../../../../framework/types.js';
import { trackingPlanChangeLogList } from './list.js';
import { trackingPlanChangeLogExport } from './export.js';

const commands: Command[] = [
  trackingPlanChangeLogList,
  trackingPlanChangeLogExport,
];

export default commands;
export { trackingPlanChangeLogList };
export { trackingPlanChangeLogExport };
