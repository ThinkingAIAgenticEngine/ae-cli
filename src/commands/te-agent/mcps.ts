/**
 * ae-cli agent MCP server management commands
 *
 * +list-mcps   — list MCP servers
 * +add-mcp     — add an MCP server (personal)
 * +del-mcp     — delete a personal MCP server
 * +toggle-mcp  — enable/disable an MCP server
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
      throw new Error('--scope must be personal, company, or system');
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
      throw new Error('--name must start with a letter and contain only letters, digits, _, or -');
    }
    if (name.length < 2 || name.length > 64) {
      throw new Error('--name length must be between 2 and 64');
    }
    try { new URL(ctx.str('url')); } catch { throw new Error('--url must be a valid URL'); }
    // Protocol allowlist: block file://, ftp://, and other non-HTTP protocols commonly used in SSRF
    if (!/^https?:\/\//i.test(ctx.str('url'))) {
      throw new Error('--url only supports http:// or https:// protocols');
    }
    const transport = ctx.str('transport');
    if (transport && !['sse', 'http'].includes(transport)) {
      throw new Error('--transport must be sse or http');
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
