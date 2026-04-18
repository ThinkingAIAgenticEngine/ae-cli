import type { Command } from '../../../framework/types.js';
import { manageTask } from './manage-task.js';
import { taskDataDetail } from './task-data-detail.js';
import { taskDataOverview } from './task-data-overview.js';
import { taskDetail } from './task-detail.js';
import { taskExperimentReport } from './task-experiment-report.js';
import { taskList } from './task-list.js';
import { taskMetricDetail } from './task-metric-detail.js';
import { taskStats } from './task-stats.js';

const commands: Command[] = [
  taskDataOverview,
  taskDataDetail,
  taskMetricDetail,
  taskExperimentReport,
  taskDetail,
  taskList,
  taskStats,
  manageTask,
];

export default commands;
