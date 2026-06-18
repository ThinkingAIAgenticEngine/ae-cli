/**
 * ae-cli agent MCP 服务管理命令
 *
 * +list-mcps   — 列出 MCP 服务
 * +add-mcp     — 添加 MCP 服务（personal）
 * +del-mcp     — 删除 personal MCP
 * +toggle-mcp  — 启用/禁用 MCP
 */

import type { Command } from '../../framework/types.js';
import {
  getFromMainApp,
  postToMainApp,
  deleteFromMainApp,
  patchToMainApp,
} from '../../core/te-agent-client.js';

const BASE_PATH = '/api/sandbox/agent/mcp-servers';

export const listMcps: Command = {
  service: 'agent',
  command: '+list-mcps',
  description: 'List MCP servers visible to current user',
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

export const addMcp: Command = {
  service: 'agent',
  command: '+add-mcp',
  description: 'Add an MCP server (personal scope)',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Server name (2-64 chars, letter start, [a-zA-Z0-9_-])' },
    { name: 'url', type: 'string', required: true, desc: 'MCP server URL' },
    { name: 'display-name', type: 'string', required: false, desc: 'Display name (max 100)' },
    { name: 'description', type: 'string', required: false, desc: 'Description (max 255)' },
    { name: 'transport', type: 'string', required: false, default: 'http', desc: 'Transport: sse | http' },
    { name: 'headers', type: 'json', required: false, desc: 'HTTP headers as JSON object' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const name = ctx.str('name');
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      throw new Error('--name 必须以字母开头，仅包含字母、数字、_、-');
    }
    if (name.length < 2 || name.length > 64) {
      throw new Error('--name 长度必须在 2-64 之间');
    }
    try { new URL(ctx.str('url')); } catch { throw new Error('--url 必须是有效 URL'); }
    // 协议白名单：拦截 file:// / ftp:// 等以及 SSRF 常用的非 http 协议
    if (!/^https?:\/\//i.test(ctx.str('url'))) {
      throw new Error('--url 仅支持 http:// 或 https:// 协议');
    }
    const transport = ctx.str('transport');
    if (transport && !['sse', 'http'].includes(transport)) {
      throw new Error('--transport 必须是 sse 或 http');
    }
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: BASE_PATH,
    body: {
      name: ctx.str('name'),
      url: ctx.str('url'),
      displayName: ctx.str('displayName') || undefined,
      description: ctx.str('description') || undefined,
      transport: ctx.str('transport') || 'http',
      headers: ctx.json('headers') || undefined,
    },
  }),
  execute: async (ctx) => {
    return postToMainApp(BASE_PATH, {
      name: ctx.str('name'),
      url: ctx.str('url'),
      displayName: ctx.str('displayName') || undefined,
      description: ctx.str('description') || undefined,
      transport: ctx.str('transport') || 'http',
      headers: ctx.json('headers') || undefined,
    });
  },
};

export const delMcp: Command = {
  service: 'agent',
  command: '+del-mcp',
  description: 'Delete a personal MCP server',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
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

export const toggleMcp: Command = {
  service: 'agent',
  command: '+toggle-mcp',
  description: 'Enable or disable an MCP server',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'MCP server record ID (CUID)' },
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
