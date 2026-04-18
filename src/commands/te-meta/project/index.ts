import type { Command } from '../../../framework/types.js';
import { getProjectConfig } from './get-project-config.js';
import { listProjectUsers } from './list-project-users.js';
import { getTrackProgram } from './get-track-program.js';
import { saveTrackItems } from './save-track-items.js';
import { deleteTrackItems } from './delete-track-items.js';
import { createProjectMarkTime } from './create-project-mark-time.js';
import { updateProjectMarkTime } from './update-project-mark-time.js';
import { listProjectMarkTimes } from './list-project-mark-times.js';
import { deleteProjectMarkTimes } from './delete-project-mark-times.js';

const commands: Command[] = [
  getProjectConfig,
  listProjectUsers,
  getTrackProgram,
  saveTrackItems,
  deleteTrackItems,
  createProjectMarkTime,
  updateProjectMarkTime,
  listProjectMarkTimes,
  deleteProjectMarkTimes,
];

export default commands;
