/**
 * ae-cli agent command domain
 *
 * Unified export of 19 commands across Agent, automations, models, MCP, Skills, and attachments.
 */

import type { Command } from '../../framework/types.js';
import { listAgents } from './agents.js';
import { listModels, addModel, delModel, toggleModel } from './models.js';
import { listMcps, addMcp, delMcp, toggleMcp } from './mcps.js';
import { listSkills, addSkill, delSkill, toggleSkill } from './skills.js';
import { listAttachments, addAttachment, delAttachment } from './attachments.js';
import { createAutomation, listAutomations, updateAutomation } from './automations.js';

const commands: Command[] = [
  // Agent 查询
  listAgents,
  // Model management
  listModels, addModel, delModel, toggleModel,
  // MCP server management
  listMcps, addMcp, delMcp, toggleMcp,
  // Skill management
  listSkills, addSkill, delSkill, toggleSkill,
  // Attachment library management
  listAttachments, addAttachment, delAttachment,
  // Automate tasks
  listAutomations, createAutomation, updateAutomation,
];

export default commands;
