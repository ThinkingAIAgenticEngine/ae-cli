import { createEngageTaskCapabilityCommand } from '../../shared.js';
import {
  buildTaskIndicatorUserInput,
  taskIndicatorUserFlags,
  taskIndicatorUserLimitFlag,
  taskIndicatorUserRequestFlag,
  taskIndicatorUserTimeoutFlag,
  validateTaskIndicatorUserInput,
} from './shared.js';

/** Queries users behind an engagement-task indicator segment inline. */
export const taskIndicatorUserRun = createEngageTaskCapabilityCommand({
  resource: 'indicator-user',
  command: 'run',
  capabilityId: 'engage-task.indicator-user.run',
  description: 'Query users behind an engagement-task indicator segment inline.',
  flags: [
    ...taskIndicatorUserFlags,
    taskIndicatorUserRequestFlag,
    taskIndicatorUserLimitFlag,
    taskIndicatorUserTimeoutFlag,
  ],
  risk: 'read',
  validate: validateTaskIndicatorUserInput,
  buildInput: buildTaskIndicatorUserInput,
});
