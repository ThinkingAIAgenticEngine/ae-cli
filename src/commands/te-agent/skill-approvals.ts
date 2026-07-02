/**
 * ae-cli agent Skill approval (company-scope publish) commands
 *
 * +submit-skill            — submit a personal Skill for company-scope review
 * +list-skill-submissions  — list Skill submissions (approvals)
 * +cancel-skill-submission — cancel a pending submission
 * +approve-skill           — approve a submission (root only)
 * +reject-skill            — reject a submission (root only)
 *
 * Approval is Skill-only (MCP has no approval flow). Submitting writes a
 * SkillSubmit row; the original personal Skill is untouched. Approving creates
 * an independent company-scope copy.
 */

import type { Command } from '../../framework/types.js';
import { getFromMainApp, postToMainApp } from '../../core/te-agent-client.js';
import {
  MARKET_CATEGORIES,
  SUBMISSION_STATUSES,
  isValidMarketCategory,
} from './market-constants.js';

const BASE = '/api/skills';

export const submitSkill: Command = {
  service: 'agent',
  command: '+submit-skill',
  description: 'Submit a personal Skill for company-scope approval review',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Skill record ID (CUID, personal scope)' },
    { name: 'description', type: 'string', required: true, desc: 'Submission reason / description (1-80 chars)' },
    { name: 'category', type: 'string', required: false, desc: `Market category key: ${MARKET_CATEGORIES.join(' | ')}` },
    { name: 'icon-emoji', type: 'string', required: false, desc: 'Market icon emoji (e.g. robot)' },
    { name: 'icon-color', type: 'string', required: false, desc: 'Market icon color (e.g. #1E76F0)' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const description = ctx.str('description');
    if (description.length < 1 || description.length > 80) {
      throw new Error('--description length must be between 1 and 80');
    }
    const category = ctx.str('category');
    if (category && !isValidMarketCategory(category)) {
      throw new Error(`--category must be one of: ${MARKET_CATEGORIES.join(', ')}`);
    }
  },
  dryRun: (ctx) => {
    const body: Record<string, string> = { description: ctx.str('description') };
    const category = ctx.str('category');
    if (category) body.category = category;
    const iconEmoji = ctx.str('iconEmoji');
    if (iconEmoji) body.iconEmoji = iconEmoji;
    const iconColor = ctx.str('iconColor');
    if (iconColor) body.iconColor = iconColor;
    return {
      method: 'POST',
      url: `${BASE}/${encodeURIComponent(ctx.str('id'))}/submit`,
      body,
    };
  },
  execute: async (ctx) => {
    const body: Record<string, string> = { description: ctx.str('description') };
    const category = ctx.str('category');
    if (category) body.category = category;
    const iconEmoji = ctx.str('iconEmoji');
    if (iconEmoji) body.iconEmoji = iconEmoji;
    const iconColor = ctx.str('iconColor');
    if (iconColor) body.iconColor = iconColor;
    return postToMainApp(`${BASE}/${encodeURIComponent(ctx.str('id'))}/submit`, body);
  },
};

export const listSkillSubmissions: Command = {
  service: 'agent',
  command: '+list-skill-submissions',
  description: 'List Skill submissions (approvals). Root sees all company submissions; others see only their own.',
  flags: [
    { name: 'status', type: 'string', required: false, desc: `Filter by status: ${SUBMISSION_STATUSES.join(' | ')}` },
    { name: 'mine', type: 'boolean', required: false, desc: 'Only show submissions created by the current user (root only)' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const status = ctx.str('status');
    if (status && !(SUBMISSION_STATUSES as readonly string[]).includes(status)) {
      throw new Error(`--status must be one of: ${SUBMISSION_STATUSES.join(', ')}`);
    }
  },
  dryRun: (ctx) => {
    const params = new URLSearchParams();
    const status = ctx.str('status');
    if (status) params.set('status', status);
    if (ctx.bool('mine')) params.set('mine', 'true');
    const qs = params.toString();
    return { method: 'GET', url: `${BASE}/submissions${qs ? `?${qs}` : ''}` };
  },
  execute: async (ctx) => {
    const params = new URLSearchParams();
    const status = ctx.str('status');
    if (status) params.set('status', status);
    if (ctx.bool('mine')) params.set('mine', 'true');
    const qs = params.toString();
    return getFromMainApp(`${BASE}/submissions${qs ? `?${qs}` : ''}`);
  },
};

export const cancelSkillSubmission: Command = {
  service: 'agent',
  command: '+cancel-skill-submission',
  description: 'Cancel a pending Skill submission (submitter or root)',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Submission record ID (CUID)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${BASE}/submissions/${encodeURIComponent(ctx.str('id'))}/cancel`,
  }),
  execute: async (ctx) => {
    return postToMainApp(`${BASE}/submissions/${encodeURIComponent(ctx.str('id'))}/cancel`, {});
  },
};

export const approveSkill: Command = {
  service: 'agent',
  command: '+approve-skill',
  description: 'Approve a pending Skill submission (root only). Creates a company-scope copy.',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Submission record ID (CUID)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${BASE}/submissions/${encodeURIComponent(ctx.str('id'))}/approve`,
  }),
  execute: async (ctx) => {
    return postToMainApp(`${BASE}/submissions/${encodeURIComponent(ctx.str('id'))}/approve`, {});
  },
};

export const rejectSkill: Command = {
  service: 'agent',
  command: '+reject-skill',
  description: 'Reject a pending Skill submission with a reason (root only).',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Submission record ID (CUID)' },
    { name: 'reason', type: 'string', required: true, desc: 'Rejection reason (1-80 chars)' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const reason = ctx.str('reason');
    if (reason.length < 1 || reason.length > 80) {
      throw new Error('--reason length must be between 1 and 80');
    }
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${BASE}/submissions/${encodeURIComponent(ctx.str('id'))}/reject`,
    body: { reason: ctx.str('reason') },
  }),
  execute: async (ctx) => {
    return postToMainApp(`${BASE}/submissions/${encodeURIComponent(ctx.str('id'))}/reject`, {
      reason: ctx.str('reason'),
    });
  },
};
