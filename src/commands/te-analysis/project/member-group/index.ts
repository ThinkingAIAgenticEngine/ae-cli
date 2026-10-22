import type { Command } from '../../../../framework/types.js';
import { projectMemberGroupAddMembers } from './add-members.js';
import { projectMemberGroupCreate } from './create.js';
import { projectMemberGroupDelete } from './delete.js';
import { projectMemberGroupList } from './list.js';
import { projectMemberGroupMembers } from './members.js';
import { projectMemberGroupRemoveMembers } from './remove-members.js';
import { projectMemberGroupRename } from './rename.js';

export {
  projectMemberGroupAddMembers,
  projectMemberGroupCreate,
  projectMemberGroupDelete,
  projectMemberGroupList,
  projectMemberGroupMembers,
  projectMemberGroupRemoveMembers,
  projectMemberGroupRename,
};

const commands: Command[] = [
  projectMemberGroupAddMembers,
  projectMemberGroupCreate,
  projectMemberGroupDelete,
  projectMemberGroupList,
  projectMemberGroupMembers,
  projectMemberGroupRemoveMembers,
  projectMemberGroupRename,
];

export default commands;
