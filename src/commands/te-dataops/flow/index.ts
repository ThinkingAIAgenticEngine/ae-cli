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
import { createWorkflowInstanceCheckTask } from './create-workflow-instance-check-task.js';
import { updateWorkflowInstanceCheckTask } from './update-workflow-instance-check-task.js';
import { createTaskInstanceCheckTask } from './create-task-instance-check-task.js';
import { updateTaskInstanceCheckTask } from './update-task-instance-check-task.js';
import { deleteTask } from './delete-task.js';
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
  updateWorkflowInstanceCheckTask,
  updateTaskInstanceCheckTask,
  addTaskRelation,
  createSqlTask,
  createIntegrationTask,
  createWorkflowInstanceCheckTask,
  createTaskInstanceCheckTask,
  deleteTask,
];

export default commands;

export {
  createWorkflowInstanceCheckTask,
  updateWorkflowInstanceCheckTask,
  createTaskInstanceCheckTask,
  updateTaskInstanceCheckTask,
  deleteTask,
};
