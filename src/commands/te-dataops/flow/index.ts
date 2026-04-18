import type { Command } from '../../../framework/types.js';

// flow commands
import { getFlowDetail } from './get-flow-detail.js';
import { listFlowInstances } from './list-flow-instances.js';
import { getExecuteRecord } from './get-execute-record.js';
import { getExecuteDag } from './get-execute-dag.js';
import { getTaskInstanceLog } from './get-task-instance-log.js';
import { getScheduleConfig } from './get-schedule-config.js';
import { listFlows } from './list-flows.js';
import { getFlowDag } from './get-flow-dag.js';
import { saveScheduleConfig } from './save-schedule-config.js';
import { executeFlow } from './execute-flow.js';
import { releaseFlow } from './release-flow.js';
import { updateFlow } from './update-flow.js';
import { createFlow } from './create-flow.js';
import { stopFlow } from './stop-flow.js';
import { getTaskParams } from './get-task-params.js';
import { validateTaskSql } from './validate-task-sql.js';
import { saveTaskDefinition } from './save-task-definition.js';
import { addTaskRelation } from './add-task-relation.js';
import { createTask } from './create-task.js';

const commands: Command[] = [
  getFlowDetail,
  listFlowInstances,
  getExecuteRecord,
  getExecuteDag,
  getTaskInstanceLog,
  getScheduleConfig,
  listFlows,
  getFlowDag,
  saveScheduleConfig,
  executeFlow,
  releaseFlow,
  updateFlow,
  createFlow,
  stopFlow,
  getTaskParams,
  validateTaskSql,
  saveTaskDefinition,
  addTaskRelation,
  createTask,
];

export default commands;