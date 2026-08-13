import { createEngageTaskCapabilityCommand } from '../../shared.js';
import {
  buildTaskIndicatorUserInput,
  taskIndicatorUserFlags,
  taskIndicatorUserFormatFlag,
  taskIndicatorUserRequestFlag,
  taskIndicatorUserTimeoutFlag,
  validateTaskIndicatorUserInput,
} from './shared.js';

/** Exports users behind an engagement-task indicator segment. */
export const taskIndicatorUserExport = createEngageTaskCapabilityCommand({
  resource: 'indicator-user',
  command: 'export',
  capabilityId: 'engage-task.indicator-user.export',
  description: 'Export users behind an engagement-task indicator segment.',
  flags: [
    ...taskIndicatorUserFlags,
    taskIndicatorUserRequestFlag,
    taskIndicatorUserFormatFlag,
    taskIndicatorUserTimeoutFlag,
  ],
  risk: 'read',
  validate: validateTaskIndicatorUserInput,
  buildInput: buildTaskIndicatorUserInput,
});
