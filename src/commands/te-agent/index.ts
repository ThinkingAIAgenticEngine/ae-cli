/**
 * ae-cli agent command domain
 *
 * Unified export of 66 commands across Agent CRUD, automations, models,
 * MCP CRUD + market + OAuth + credentials, Skills CRUD + market + copy +
 * content + assets + approval + share, attachments.
 */

import type { Command } from '../../framework/types.js';
import { listAgents, createAgent, updateAgent, delAgent, getAgent } from './agents.js';
import {
  listModels,
  addModel,
  delModel,
  toggleModel,
  updateModel,
  testModel,
} from './models.js';
import {
  listMcps,
  addMcp,
  delMcp,
  toggleMcp,
  listMcpMarket,
  setMcpMeta,
  updateMcp,
  mcpTools,
  mcpAuthStart,
  mcpAuthStatus,
  mcpAuthDisconnect,
  listMcpCredentials,
  setMcpCredential,
  autoProvisionMcpCredentials,
  mcpToken,
  mcpStats,
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
  editSkill,
  getSkillContent,
  listSkillAssets,
  uploadSkillAsset,
  readSkillAsset,
  delSkillAsset,
  listSkillReferences,
  uploadSkillReference,
  readSkillReference,
  delSkillReference,
  listSkillScripts,
  uploadSkillScript,
  readSkillScript,
  delSkillScript,
  uploadSkill,
  rescanSkills,
} from './skill-content.js';
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
import { listAttachments, addAttachment, delAttachment, attachmentStats } from './attachments.js';
import { createAutomation, listAutomations, updateAutomation } from './automations.js';

const commands: Command[] = [
  // Agent CRUD
  listAgents, createAgent, updateAgent, delAgent, getAgent,
  // Model management + test
  listModels, addModel, delModel, toggleModel, updateModel, testModel,
  // MCP server management + market + OAuth + credentials
  listMcps, addMcp, delMcp, toggleMcp, listMcpMarket, setMcpMeta,
  updateMcp, mcpTools, mcpAuthStart, mcpAuthStatus, mcpAuthDisconnect,
  listMcpCredentials, setMcpCredential, autoProvisionMcpCredentials, mcpToken, mcpStats,
  // Skill management + market + copy
  listSkills, addSkill, delSkill, toggleSkill, listSkillMarket, setSkillMeta, copySkill,
  // Skill content + assets (references / assets / scripts)
  editSkill, getSkillContent,
  listSkillAssets, uploadSkillAsset, readSkillAsset, delSkillAsset,
  listSkillReferences, uploadSkillReference, readSkillReference, delSkillReference,
  listSkillScripts, uploadSkillScript, readSkillScript, delSkillScript,
  uploadSkill, rescanSkills,
  // Skill approval (company-scope publish)
  submitSkill, listSkillSubmissions, cancelSkillSubmission, approveSkill, rejectSkill,
  // Skill share (peer-to-peer)
  shareSkill, listSkillShares, acceptSkillShare, rejectSkillShare,
  // Attachment library management
  listAttachments, addAttachment, delAttachment, attachmentStats,
  // Automate tasks
  listAutomations, createAutomation, updateAutomation,
];

export default commands;
