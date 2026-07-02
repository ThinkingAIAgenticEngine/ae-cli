/**
 * ae-cli agent command domain
 *
 * Unified export of 33 commands across Agent, automations, models, MCP, Skills,
 * attachments, market browsing, Skill copy, Skill approval, and Skill share.
 */

import type { Command } from '../../framework/types.js';
import { listAgents } from './agents.js';
import { listModels, addModel, delModel, toggleModel } from './models.js';
import {
  listMcps,
  addMcp,
  delMcp,
  toggleMcp,
  listMcpMarket,
  setMcpMeta,
} from './mcps.js';
import {
  listSkills,
  addSkill,
  delSkill,
  toggleSkill,
  listSkillMarket,
  setSkillMeta,
  copySkill,
} from './skills.js';
import {
  submitSkill,
  listSkillSubmissions,
  cancelSkillSubmission,
  approveSkill,
  rejectSkill,
} from './skill-approvals.js';
import {
  shareSkill,
  listSkillShares,
  acceptSkillShare,
  rejectSkillShare,
} from './skill-shares.js';
import { listAttachments, addAttachment, delAttachment } from './attachments.js';
import { createAutomation, listAutomations, updateAutomation } from './automations.js';

const commands: Command[] = [
  // Agent query
  listAgents,
  // Model management
  listModels, addModel, delModel, toggleModel,
  // MCP server management + market
  listMcps, addMcp, delMcp, toggleMcp, listMcpMarket, setMcpMeta,
  // Skill management + market + copy
  listSkills, addSkill, delSkill, toggleSkill, listSkillMarket, setSkillMeta, copySkill,
  // Skill approval (company-scope publish)
  submitSkill, listSkillSubmissions, cancelSkillSubmission, approveSkill, rejectSkill,
  // Skill share (peer-to-peer)
  shareSkill, listSkillShares, acceptSkillShare, rejectSkillShare,
  // Attachment library management
  listAttachments, addAttachment, delAttachment,
  // Automate tasks
  listAutomations, createAutomation, updateAutomation,
];

export default commands;
