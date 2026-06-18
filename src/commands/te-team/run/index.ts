import type { Command } from '../../../framework/types.js';
import { startRun } from './start-run.js';
import { chatRun } from './chat-run.js';
import { cancelRun } from './cancel-run.js';
import { replyRun } from './reply-run.js';
import { getResult } from './get-result.js';
import { listArtifacts } from './list-artifacts.js';
import { watchRun } from './watch-run.js';

const commands: Command[] = [
  startRun,
  chatRun,
  cancelRun,
  replyRun,
  getResult,
  listArtifacts,
  watchRun,
];

export default commands;
