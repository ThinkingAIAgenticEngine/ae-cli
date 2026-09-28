import type { Command } from '../../../framework/types.js';
import { projectMemberAdd } from './add.js';
import { projectMemberBatchUpdate } from './batch-update.js';
import { projectMemberImport } from './import.js';
import { projectMemberList } from './list.js';
import { projectMemberRemove } from './remove.js';
import { projectMemberUpdate } from './update.js';

const commands: Command[] = [
  projectMemberAdd,
  projectMemberBatchUpdate,
  projectMemberImport,
  projectMemberList,
  projectMemberRemove,
  projectMemberUpdate,
];

export default commands;
