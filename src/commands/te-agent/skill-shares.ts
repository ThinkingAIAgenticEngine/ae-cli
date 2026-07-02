/**
 * ae-cli agent Skill share (peer-to-peer personal transfer) commands
 *
 * +share-skill         — share a personal Skill to another user
 * +list-skill-shares   — list Skill shares (received or sent)
 * +accept-skill-share  — accept a received share (creates a personal copy)
 * +reject-skill-share  — reject a received share
 *
 * Sharing is Skill-only (MCP has no share flow). The sender shares a personal
 * Skill to a same-company recipient; accepting creates an independent personal
 * copy for the recipient.
 */

import type { Command } from '../../framework/types.js';
import { getFromMainApp, postToMainApp } from '../../core/te-agent-client.js';
import {
  MARKET_CATEGORIES,
  SHARE_DIRECTIONS,
  SHARE_STATUSES,
  isValidMarketCategory,
} from './market-constants.js';

const BASE = '/api/skills';

export const shareSkill: Command = {
  service: 'agent',
  command: '+share-skill',
  description: 'Share a personal Skill to another user in the same company',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Skill record ID (CUID, personal scope)' },
    { name: 'to-user-id', type: 'string', required: true, desc: 'Recipient user ID (same company)' },
    { name: 'category', type: 'string', required: false, desc: `Market category key: ${MARKET_CATEGORIES.join(' | ')}` },
    { name: 'icon-emoji', type: 'string', required: false, desc: 'Market icon emoji (e.g. robot)' },
    { name: 'icon-color', type: 'string', required: false, desc: 'Market icon color (e.g. #1E76F0)' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const category = ctx.str('category');
    if (category && !isValidMarketCategory(category)) {
      throw new Error(`--category must be one of: ${MARKET_CATEGORIES.join(', ')}`);
    }
  },
  dryRun: (ctx) => {
    const body: Record<string, string> = { toUserId: ctx.str('toUserId') };
    const category = ctx.str('category');
    if (category) body.category = category;
    const iconEmoji = ctx.str('iconEmoji');
    if (iconEmoji) body.iconEmoji = iconEmoji;
    const iconColor = ctx.str('iconColor');
    if (iconColor) body.iconColor = iconColor;
    return {
      method: 'POST',
      url: `${BASE}/${encodeURIComponent(ctx.str('id'))}/share`,
      body,
    };
  },
  execute: async (ctx) => {
    const body: Record<string, string> = { toUserId: ctx.str('toUserId') };
    const category = ctx.str('category');
    if (category) body.category = category;
    const iconEmoji = ctx.str('iconEmoji');
    if (iconEmoji) body.iconEmoji = iconEmoji;
    const iconColor = ctx.str('iconColor');
    if (iconColor) body.iconColor = iconColor;
    return postToMainApp(`${BASE}/${encodeURIComponent(ctx.str('id'))}/share`, body);
  },
};

export const listSkillShares: Command = {
  service: 'agent',
  command: '+list-skill-shares',
  description: 'List Skill shares (received by default; use --direction sent for outgoing)',
  flags: [
    { name: 'direction', type: 'string', required: false, default: 'received', desc: `Direction: ${SHARE_DIRECTIONS.join(' | ')}` },
    { name: 'status', type: 'string', required: false, desc: `Filter by status: ${SHARE_STATUSES.join(' | ')}` },
  ],
  risk: 'read',
  validate: (ctx) => {
    const direction = ctx.str('direction');
    if (direction && !(SHARE_DIRECTIONS as readonly string[]).includes(direction)) {
      throw new Error(`--direction must be one of: ${SHARE_DIRECTIONS.join(', ')}`);
    }
    const status = ctx.str('status');
    if (status && !(SHARE_STATUSES as readonly string[]).includes(status)) {
      throw new Error(`--status must be one of: ${SHARE_STATUSES.join(', ')}`);
    }
  },
  dryRun: (ctx) => {
    const params = new URLSearchParams();
    params.set('direction', ctx.str('direction') || 'received');
    const status = ctx.str('status');
    if (status) params.set('status', status);
    return { method: 'GET', url: `${BASE}/shares?${params.toString()}` };
  },
  execute: async (ctx) => {
    const params = new URLSearchParams();
    params.set('direction', ctx.str('direction') || 'received');
    const status = ctx.str('status');
    if (status) params.set('status', status);
    return getFromMainApp(`${BASE}/shares?${params.toString()}`);
  },
};

export const acceptSkillShare: Command = {
  service: 'agent',
  command: '+accept-skill-share',
  description: 'Accept a received Skill share (creates a personal copy for the recipient)',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Share record ID (CUID)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${BASE}/shares/${encodeURIComponent(ctx.str('id'))}/accept`,
  }),
  execute: async (ctx) => {
    return postToMainApp(`${BASE}/shares/${encodeURIComponent(ctx.str('id'))}/accept`, {});
  },
};

export const rejectSkillShare: Command = {
  service: 'agent',
  command: '+reject-skill-share',
  description: 'Reject a received Skill share',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Share record ID (CUID)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${BASE}/shares/${encodeURIComponent(ctx.str('id'))}/reject`,
  }),
  execute: async (ctx) => {
    return postToMainApp(`${BASE}/shares/${encodeURIComponent(ctx.str('id'))}/reject`, {});
  },
};
