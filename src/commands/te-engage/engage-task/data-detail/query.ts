import { createEngageTaskCapabilityCommand } from '../../shared.js';
import {
  buildTaskDataDetailInput,
  taskDataDetailFlags,
  validateTaskDataDetailInput,
} from '../task-data-shared.js';

/** Queries task data-detail report data through the Hermes task-data implementation. */
export const dataDetailQuery = createEngageTaskCapabilityCommand({
  resource: 'data-detail',
  command: 'query',
  capabilityId: 'engage-task.task-data.detail',
  description: 'Query task data-detail report data.',
  flags: taskDataDetailFlags,
  risk: 'read',
  validate: validateTaskDataDetailInput,
  buildInput: buildTaskDataDetailInput,
});
