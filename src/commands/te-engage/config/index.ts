import type { Command } from '../../../framework/types.js';
import { configItemAnalysisReport } from './config-item-analysis-report.js';
import { configItemDetail } from './config-item-detail.js';
import { configItemList } from './config-item-list.js';
import { configItemStrategyComparison } from './config-item-strategy-comparison.js';
import { configItemTriggerReport } from './config-item-trigger-report.js';
import { copyConfigTemplate } from './copy-config-template.js';
import { deleteConfigItem } from './delete-config-item.js';
import { manageStrategy } from './manage-strategy.js';
import { strategyDetail } from './strategy-detail.js';
import { strategyList } from './strategy-list.js';

const commands: Command[] = [
  configItemTriggerReport,
  configItemAnalysisReport,
  configItemStrategyComparison,
  configItemList,
  configItemDetail,
  deleteConfigItem,
  copyConfigTemplate,
  strategyList,
  strategyDetail,
  manageStrategy,
];

export default commands;
