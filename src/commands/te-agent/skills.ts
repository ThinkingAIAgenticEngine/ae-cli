/**
 * ae-cli agent Skill 管理命令
 *
 * +list-skills   — 列出 Skill
 * +add-skill     — 创建自定义 Skill（personal）
 * +del-skill     — 删除 personal Skill
 * +toggle-skill  — 启用/禁用 Skill
 */

import type { Command } from '../../framework/types.js';
import {
  getFromMainApp,
  postToMainApp,
  deleteFromMainApp,
  patchToMainApp,
} from '../../core/te-agent-client.js';

const BASE_PATH = '/api/sandbox/agent/skills';

/**
 * 解析 instructions 参数：支持 @- 从 stdin 读取
 */
async function resolveInstructions(raw: string): Promise<string> {
  if (raw === '@-') {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const text = Buffer.concat(chunks).toString('utf8').trim();
    if (!text) throw new Error('stdin 为空，无法读取 instructions');
    return text;
  }
  return raw;
}

export const listSkills: Command = {
  service: 'agent',
  command: '+list-skills',
  description: 'List Skills visible to current user',
  flags: [
    { name: 'scope', type: 'string', required: false, desc: 'Filter by scope: personal | company | system' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const scope = ctx.str('scope');
    if (scope && !['personal', 'company', 'system'].includes(scope)) {
      throw new Error('--scope 必须是 personal、company 或 system');
    }
  },
  dryRun: (ctx) => {
    const scope = ctx.str('scope');
    const qs = scope ? `?scope=${encodeURIComponent(scope)}` : '';
    return { method: 'GET', url: `${BASE_PATH}${qs}` };
  },
  execute: async (ctx) => {
    const scope = ctx.str('scope');
    const qs = scope ? `?scope=${encodeURIComponent(scope)}` : '';
    return getFromMainApp(`${BASE_PATH}${qs}`);
  },
};

export const addSkill: Command = {
  service: 'agent',
  command: '+add-skill',
  description: 'Create a custom Skill (personal scope)',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Skill name (1-80 chars)' },
    { name: 'description', type: 'string', required: true, desc: 'Skill description' },
    { name: 'instructions', type: 'string', required: true, desc: 'Skill instructions (use @- to read from stdin)' },
    { name: 'display-name', type: 'string', required: false, desc: 'Display name (max 100)' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const name = ctx.str('name');
    if (name.length < 1 || name.length > 80) {
      throw new Error('--name 长度必须在 1-80 之间');
    }
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: BASE_PATH,
    body: {
      name: ctx.str('name'),
      description: ctx.str('description'),
      instructions: ctx.str('instructions') === '@-' ? '(from stdin)' : ctx.str('instructions'),
      displayName: ctx.str('displayName') || undefined,
    },
  }),
  execute: async (ctx) => {
    const instructions = await resolveInstructions(ctx.str('instructions'));
    return postToMainApp(BASE_PATH, {
      name: ctx.str('name'),
      description: ctx.str('description'),
      instructions,
      displayName: ctx.str('displayName') || undefined,
    });
  },
};

export const delSkill: Command = {
  service: 'agent',
  command: '+del-skill',
  description: 'Delete a personal Skill (physical delete)',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Skill record ID (CUID)' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${BASE_PATH}?id=${encodeURIComponent(ctx.str('id'))}`,
  }),
  execute: async (ctx) => {
    return deleteFromMainApp(`${BASE_PATH}?id=${encodeURIComponent(ctx.str('id'))}`);
  },
};

export const toggleSkill: Command = {
  service: 'agent',
  command: '+toggle-skill',
  description: 'Enable or disable a Skill',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Skill record ID (CUID)' },
    { name: 'enabled', type: 'boolean', required: true, desc: 'true to enable, false to disable' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'PATCH',
    url: BASE_PATH,
    body: { id: ctx.str('id'), enabled: ctx.bool('enabled') },
  }),
  execute: async (ctx) => {
    return patchToMainApp(BASE_PATH, {
      id: ctx.str('id'),
      enabled: ctx.bool('enabled'),
    });
  },
};
