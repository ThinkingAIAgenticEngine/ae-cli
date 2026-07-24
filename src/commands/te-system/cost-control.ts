import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import {
  createAdminCommand,
  encodeId,
  optionalString,
  requireJsonObject,
} from './shared.js';

function createRuleBody(ctx: RuntimeContext): Record<string, unknown> {
  const rule = requireJsonObject(ctx, 'rule');
  for (const key of ['name', 'subjectType', 'periodType']) {
    if (typeof rule[key] !== 'string' || !(rule[key] as string).trim()) {
      throw new CliValidationError(`--rule.${key} is required`);
    }
  }
  return rule;
}

export const getCostSummary = createAdminCommand({
  command: '+get-cost-summary',
  description: 'Get company cost, quota, and usage summary',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/cost-control/summary' }),
});

export const getBalanceAlert = createAdminCommand({
  command: '+get-balance-alert',
  description: 'Get the company balance alert configuration and current status',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/cost-control/balance-alert' }),
});

export const setBalanceAlert = createAdminCommand({
  command: '+set-balance-alert',
  description: 'Enable, update, or disable the company balance alert',
  flags: [
    { name: 'enabled', type: 'boolean', required: true, desc: 'Whether the balance alert is enabled' },
    { name: 'threshold', type: 'string', desc: 'Positive alert threshold; required when enabling' },
  ],
  risk: 'write',
  validate: (ctx) => {
    if (ctx.bool('enabled') && !optionalString(ctx, 'threshold')) {
      throw new CliValidationError('--threshold is required when --enabled is true');
    }
  },
  prepare: (ctx) => ({
    method: 'PATCH',
    path: '/api/admin/cost-control/balance-alert',
    body: {
      enabled: ctx.bool('enabled'),
      ...(optionalString(ctx, 'threshold') ? { threshold: ctx.str('threshold') } : {}),
    },
  }),
});

export const listQuotaRules = createAdminCommand({
  command: '+list-quota-rules',
  description: 'List company cost and token quota rules',
  flags: [],
  risk: 'read',
  prepare: () => ({ method: 'GET', path: '/api/admin/quota-rules' }),
});

export const createQuotaRule = createAdminCommand({
  command: '+create-quota-rule',
  description: 'Create a company or user cost/token quota rule',
  flags: [
    {
      name: 'rule',
      type: 'string',
      required: true,
      sensitive: true,
      desc: 'Quota rule JSON object, @file, or stdin (-)',
    },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'POST',
    path: '/api/admin/quota-rules',
    body: createRuleBody(ctx),
  }),
});

export const updateQuotaRule = createAdminCommand({
  command: '+update-quota-rule',
  description: 'Update an existing cost/token quota rule',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Quota rule ID from +list-quota-rules' },
    {
      name: 'rule',
      type: 'string',
      required: true,
      sensitive: true,
      desc: 'Partial quota rule JSON object, @file, or stdin (-)',
    },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'PATCH',
    path: `/api/admin/quota-rules/${encodeId(ctx.str('id'))}`,
    body: requireJsonObject(ctx, 'rule'),
  }),
});

export const removeQuotaRule = createAdminCommand({
  command: '+remove-quota-rule',
  description: 'Delete a cost/token quota rule',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Quota rule ID from +list-quota-rules' },
  ],
  risk: 'high-risk-write',
  prepare: (ctx) => ({
    method: 'DELETE',
    path: `/api/admin/quota-rules/${encodeId(ctx.str('id'))}`,
  }),
});

export const bindQuotaRuleUser = createAdminCommand({
  command: '+bind-quota-rule-user',
  description: 'Bind a quota rule to a TE user',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Quota rule ID from +list-quota-rules' },
    { name: 'open-id', type: 'string', required: true, desc: 'TE user openId' },
  ],
  risk: 'write',
  prepare: (ctx) => ({
    method: 'POST',
    path: `/api/admin/quota-rules/${encodeId(ctx.str('id'))}/bind-user`,
    body: { openId: ctx.str('open-id') },
  }),
});

export const costControlCommands: Command[] = [
  getCostSummary,
  getBalanceAlert,
  setBalanceAlert,
  listQuotaRules,
  createQuotaRule,
  updateQuotaRule,
  removeQuotaRule,
  bindQuotaRuleUser,
];
