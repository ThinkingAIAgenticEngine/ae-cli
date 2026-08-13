import { createEngageTaskCapabilityCommand } from '../../shared.js';
import {
  buildTaskIndicatorUserInput,
  taskIndicatorUserFlags,
  validateTaskIndicatorUserInput,
} from './shared.js';

/** Builds validated user-detail SQL for an engagement-task indicator segment. */
export const taskIndicatorUserSql = createEngageTaskCapabilityCommand({
  resource: 'indicator-user',
  command: 'sql',
  capabilityId: 'engage-task.indicator-user.sql',
  description: 'Build validated user-detail SQL for an engagement-task indicator segment.',
  flags: taskIndicatorUserFlags,
  risk: 'read',
  validate: validateTaskIndicatorUserInput,
  buildInput: buildTaskIndicatorUserInput,
});
