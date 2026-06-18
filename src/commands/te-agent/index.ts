/**
 * ae-cli agent 命令域
 *
 * 统一导出模型、MCP、Skill、附件库四个模块的 15 个命令。
 */

import type { Command } from '../../framework/types.js';
import { listModels, addModel, delModel, toggleModel } from './models.js';
import { listMcps, addMcp, delMcp, toggleMcp } from './mcps.js';
import { listSkills, addSkill, delSkill, toggleSkill } from './skills.js';
import { listAttachments, addAttachment, delAttachment } from './attachments.js';

const commands: Command[] = [
  // 模型管理
  listModels, addModel, delModel, toggleModel,
  // MCP 服务管理
  listMcps, addMcp, delMcp, toggleMcp,
  // Skill 管理
  listSkills, addSkill, delSkill, toggleSkill,
  // 附件库管理
  listAttachments, addAttachment, delAttachment,
];

export default commands;
