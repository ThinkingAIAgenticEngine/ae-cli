/**
 * ae-cli agent model management commands
 *
 * +list-models  — list visible models
 * +add-model    — add a custom model (personal)
 * +del-model    — delete a personal model
 * +toggle-model — enable/disable a model
 */

import type { Command } from '../../framework/types.js';
import {
  getFromMainApp,
  postToMainApp,
  deleteFromMainApp,
  patchToMainApp,
} from '../../core/te-agent-client.js';

const BASE_PATH = '/api/sandbox/agent/models';

export const listModels: Command = {
  service: 'agent',
  command: '+list-models',
  description: 'List models visible to current user (personal / company / system)',
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

export const addModel: Command = {
  service: 'agent',
  command: '+add-model',
  description: 'Add a custom model (personal scope)',
  flags: [
    { name: 'model-id', type: 'string', required: true, desc: 'Model identifier (e.g. gpt-4o)' },
    { name: 'name', type: 'string', required: true, desc: 'Display name' },
    { name: 'base-url', type: 'string', required: true, desc: 'API base URL' },
    { name: 'api-key', type: 'string', required: false, desc: 'API key' },
    { name: 'provider', type: 'string', required: false, desc: 'Provider name' },
    { name: 'description', type: 'string', required: false, desc: 'Description' },
    { name: 'context-length', type: 'number', required: false, desc: 'Context window length' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const baseUrl = ctx.str('baseUrl');
    try { new URL(baseUrl); } catch { throw new Error('--base-url must be a valid URL'); }
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: BASE_PATH,
    body: {
      modelId: ctx.str('modelId'),
      displayName: ctx.str('name'),
      baseUrl: ctx.str('baseUrl'),
      apiKey: ctx.str('apiKey') || undefined,
      provider: ctx.str('provider') || undefined,
      description: ctx.str('description') || undefined,
      contextLength: ctx.num('contextLength') || undefined,
    },
  }),
  execute: async (ctx) => {
    return postToMainApp(BASE_PATH, {
      modelId: ctx.str('modelId'),
      displayName: ctx.str('name'),
      baseUrl: ctx.str('baseUrl'),
      apiKey: ctx.str('apiKey') || undefined,
      provider: ctx.str('provider') || undefined,
      description: ctx.str('description') || undefined,
      contextLength: ctx.num('contextLength') || undefined,
    });
  },
};

export const delModel: Command = {
  service: 'agent',
  command: '+del-model',
  description: 'Delete a personal model',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Model record ID (CUID)' },
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

export const toggleModel: Command = {
  service: 'agent',
  command: '+toggle-model',
  description: 'Enable or disable a model',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Model record ID (CUID)' },
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
