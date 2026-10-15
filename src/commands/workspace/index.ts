import type { Command } from '../../framework/types.js';
import { listWorkspaces } from './list.js';
import { getWorkspace } from './get.js';
import { currentWorkspace } from './current.js';
import { createWorkspace } from './create.js';
import { updateWorkspace } from './update.js';
import { deleteWorkspace } from './delete.js';
import { recoverWorkspace } from './recover.js';
import { listWorkspaceAssets } from './asset/list.js';
import { readWorkspaceAsset } from './asset/read.js';
import { uploadWorkspaceAsset } from './asset/upload.js';
import { downloadWorkspaceAsset } from './asset/download.js';
import { mkdirWorkspaceAsset } from './asset/mkdir.js';
import { moveWorkspaceAsset } from './asset/move.js';
import { deleteWorkspaceAsset } from './asset/delete.js';
import { listWorkspaceCapabilities } from './capability/list.js';
import { setWorkspaceCapabilities } from './capability/set.js';
import { listWorkspaceMembers } from './member/list.js';
import { addWorkspaceMember } from './member/add.js';
import { updateWorkspaceMember } from './member/update.js';
import { transferWorkspaceOwner } from './member/transfer-owner.js';
import { removeWorkspaceMember } from './member/remove.js';
import { listWorkspaceActivities } from './activity/list.js';

export {
  listWorkspaces,
  getWorkspace,
  currentWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  recoverWorkspace,
  listWorkspaceAssets,
  readWorkspaceAsset,
  uploadWorkspaceAsset,
  downloadWorkspaceAsset,
  mkdirWorkspaceAsset,
  moveWorkspaceAsset,
  deleteWorkspaceAsset,
  listWorkspaceCapabilities,
  setWorkspaceCapabilities,
  listWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMember,
  transferWorkspaceOwner,
  removeWorkspaceMember,
  listWorkspaceActivities,
};

const commands: Command[] = [
  listWorkspaces,
  getWorkspace,
  currentWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  recoverWorkspace,
  listWorkspaceAssets,
  readWorkspaceAsset,
  uploadWorkspaceAsset,
  downloadWorkspaceAsset,
  mkdirWorkspaceAsset,
  moveWorkspaceAsset,
  deleteWorkspaceAsset,
  listWorkspaceCapabilities,
  setWorkspaceCapabilities,
  listWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMember,
  transferWorkspaceOwner,
  removeWorkspaceMember,
  listWorkspaceActivities,
];

export default commands;
