import type { Command } from '../../../framework/types.js';
import { listTags } from './list-tags.js';
import { getTagsByName } from './get-tags-by-name.js';
import { listTagMembers } from './list-tag-members.js';
import { createTag } from './create-tag.js';
import { updateTag } from './update-tag.js';
import { refreshTag } from './refresh-tag.js';

const commands: Command[] = [
  listTags,
  getTagsByName,
  listTagMembers,
  createTag,
  updateTag,
  refreshTag,
];

export default commands;
