import type { Command } from '../../../framework/types.js';
import { listTags } from './list-tags.js';
import { getTagsByName } from './get-tags-by-name.js';
import { listTagMembers } from './list-tag-members.js';
import { buildTagDefinition } from './build-tag-definition.js';
import { createTag } from './create-tag.js';
import { updateTag } from './update-tag.js';
import { refreshTag } from './refresh-tag.js';
import { createIdTag } from './create-id-tag.js';
import { updateIdTag } from './update-id-tag.js';
import { deleteTag } from './delete-tag.js';

const commands: Command[] = [
  listTags,
  getTagsByName,
  listTagMembers,
  buildTagDefinition,
  createTag,
  updateTag,
  refreshTag,
  createIdTag,
  updateIdTag,
  deleteTag,
];

export default commands;
