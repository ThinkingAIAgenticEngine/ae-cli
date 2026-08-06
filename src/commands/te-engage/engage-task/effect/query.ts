import { createEngageTaskCapabilityCommand } from '../../shared.js';
import {
  buildTaskMetricDetailInput,
  taskMetricDetailFlags,
  validateTaskMetricDetailInput,
} from '../task-data-shared.js';

/** Queries task metric-detail report data through the Hermes task-data implementation. */
export const taskEffectQuery = createEngageTaskCapabilityCommand({
  resource: 'effect',
  command: 'query',
  capabilityId: 'engage-task.task-data.metric-detail',
  description: 'Query task metric-detail report data.',
  flags: taskMetricDetailFlags,
  risk: 'read',
  validate: validateTaskMetricDetailInput,
  buildInput: buildTaskMetricDetailInput,
});
