import type { Command } from '../../framework/types.js';
import {
  assertEnum,
  createAdminCommand,
  encodeId,
  optionalString,
  withQuery,
} from './shared.js';

const BIZ_TYPES = ['AE_AGENT', 'AI_QA'] as const;

export const listSystemModels = createAdminCommand({
  command: '+list-system-models',
  description: 'List system models and current company visibility',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/system-models' }),
});

export const setSystemModelEnabled = createAdminCommand({
  command: '+set-system-model-enabled',
  description: 'Enable or disable a system model for the current company',
  flags: [
    { name: 'model-id', type: 'string', required: true, desc: 'System Model.id from +list-system-models' },
    { name: 'enabled', type: 'boolean', required: true, desc: 'Whether the model is visible to the company' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PATCH',
    path: `/api/admin/system-models/${encodeId(ctx.str('model-id'))}/company-enabled`,
    body: { enabled: ctx.bool('enabled') },
  }),
});

export const getModelSyncSettings = createAdminCommand({
  command: '+get-model-sync-settings',
  description: 'Get the company policy for newly synchronized system models',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/models/sync-settings' }),
});

export const setModelSyncSettings = createAdminCommand({
  command: '+set-model-sync-settings',
  description: 'Set whether newly synchronized system models are enabled for the company',
  flags: [
    {
      name: 'new-system-models-enabled-by-default',
      type: 'boolean',
      required: true,
      desc: 'Whether future system models are enabled for this company by default',
    },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PATCH',
    path: '/api/admin/models/sync-settings',
    body: {
      newSystemModelsEnabledByDefault: ctx.bool('new-system-models-enabled-by-default'),
    },
  }),
});

export const getSystemModelPriceRules = createAdminCommand({
  command: '+get-system-model-price-rules',
  description: 'Get the stored pricing rule snapshot for one managed system model',
  flags: [
    { name: 'model-id', type: 'string', required: true, desc: 'System Model.id from +list-system-models' },
  ],
  risk: 'read',
  prepare: (ctx) => ({
    method: 'GET',
    path: `/api/admin/system-models/${encodeId(ctx.str('model-id'))}/price-rules`,
  }),
});

export const listCompanyModels = createAdminCommand({
  command: '+list-company-models',
  description: 'List all company models, including disabled models',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/company-models' }),
});

export const setCompanyModelEnabled = createAdminCommand({
  command: '+set-company-model-enabled',
  description: 'Enable or disable a company model for all company users',
  flags: [
    { name: 'model-id', type: 'string', required: true, desc: 'Company Model.id from +list-company-models' },
    { name: 'enabled', type: 'boolean', required: true, desc: 'Whether the company model is enabled' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PATCH',
    path: `/api/admin/company-models/${encodeId(ctx.str('model-id'))}`,
    body: { enabled: ctx.bool('enabled') },
  }),
});

export const getDefaultModels = createAdminCommand({
  command: '+get-default-models',
  description: 'Get the company default models for Agent and AI QA',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/models/default-config' }),
});

export const setDefaultModel = createAdminCommand({
  command: '+set-default-model',
  description: 'Set the company default model for Agent or AI QA',
  flags: [
    { name: 'model-id', type: 'string', required: true, desc: 'Model.id from a system/company model list' },
    {
      name: 'biz-type',
      type: 'string',
      default: 'AE_AGENT',
      desc: `Default model slot: ${BIZ_TYPES.join(' | ')}`,
    },
  ],
  risk: 'write',
  validate: (ctx) => assertEnum('biz-type', optionalString(ctx, 'biz-type'), BIZ_TYPES),
  prepare: (ctx) => ({
    method: 'POST',
    path: '/api/admin/models/default-config',
    body: {
      modelId: ctx.str('model-id'),
      bizType: ctx.str('biz-type') || 'AE_AGENT',
    },
  }),
});

export const clearDefaultModel = createAdminCommand({
  command: '+clear-default-model',
  description: 'Clear the company default model for Agent or AI QA',
  flags: [
    {
      name: 'biz-type',
      type: 'string',
      default: 'AE_AGENT',
      desc: `Default model slot: ${BIZ_TYPES.join(' | ')}`,
    },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => assertEnum('biz-type', optionalString(ctx, 'biz-type'), BIZ_TYPES),
  prepare: (ctx) => ({
    method: 'DELETE',
    path: withQuery('/api/admin/models/default-config', {
      bizType: ctx.str('biz-type') || 'AE_AGENT',
    }),
  }),
});

export const modelCommands: Command[] = [
  listSystemModels,
  setSystemModelEnabled,
  getModelSyncSettings,
  setModelSyncSettings,
  getSystemModelPriceRules,
  listCompanyModels,
  setCompanyModelEnabled,
  getDefaultModels,
  setDefaultModel,
  clearDefaultModel,
];
