import type { Command } from '../../../framework/types.js';
import { projectRoleDelete } from './delete.js';
import { projectRoleGet } from './get.js';
import { projectRoleList } from './list.js';
import { projectRoleUpsert } from './upsert.js';

const commands: Command[] = [
  projectRoleDelete,
  projectRoleGet,
  projectRoleList,
  projectRoleUpsert,
];

export default commands;
