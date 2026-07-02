import type { Command } from '../../../framework/types.js';

import { getFlowOverview } from './get-flow-overview.js';
import { listFlows } from './list-flows.js';
import { saveScheduleConfig } from './save-schedule-config.js';
import { executeFlow } from './execute-flow.js';
import { releaseFlow } from './release-flow.js';
import { previewReleaseFlow } from './preview-release-flow.js';
import { updateFlow } from './update-flow.js';
import { createFlow } from './create-flow.js';
import { getTaskParams } from './get-task-params.js';
import { addTaskRelation } from './add-task-relation.js';
import { createSqlTask } from './create-sql-task.js';
import { updateSqlTask } from './update-sql-task.js';
import { createIntegrationTask } from './create-integration-task.js';
import { updateIntegrationTask } from './update-integration-task.js';
import { listHighFrequencyReleaseFlows } from './list-high-frequency-release-flows.js';

const commands: Command[] = [
  getFlowOverview,
  listFlows,
  listHighFrequencyReleaseFlows,
  saveScheduleConfig,
  executeFlow,
  previewReleaseFlow,
  releaseFlow,
  updateFlow,
  createFlow,
  getTaskParams,
  updateSqlTask,
  updateIntegrationTask,
  addTaskRelation,
  createSqlTask,
  createIntegrationTask,
];

export default commands;
