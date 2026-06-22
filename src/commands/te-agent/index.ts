/**
 * ae-cli agent command domain
 *
 * Unified export of 15 commands across the four modules: models, MCP, Skills, and attachments.
 */

import type { Command } from '../../framework/types.js';
import { listModels, addModel, delModel, toggleModel } from './models.js';
import { listMcps, addMcp, delMcp, toggleMcp } from './mcps.js';
import { listSkills, addSkill, delSkill, toggleSkill } from './skills.js';
import { listAttachments, addAttachment, delAttachment } from './attachments.js';

const commands: Command[] = [
  // Model management
  listModels, addModel, delModel, toggleModel,
  // MCP server management
  listMcps, addMcp, delMcp, toggleMcp,
  // Skill management
  listSkills, addSkill, delSkill, toggleSkill,
  // Attachment library management
  listAttachments, addAttachment, delAttachment,
];

export default commands;
