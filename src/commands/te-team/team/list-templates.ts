import type { Command } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_TPL_PATH } from '../shared.js';

export const listTemplates: Command = {
  service: 'team',
  command: '+list-templates',
  description: 'List available team templates.',
  flags: [
    { name: 'locale', type: 'string', required: false, desc: 'Locale: zh (default) | en | ja | ko' },
  ],
  risk: 'read',
  dryRun: (ctx) => {
    const params: Record<string, string> = {};
    const locale = ctx.str('locale');
    if (locale) params.locale = locale;
    return { method: 'GET', url: `${ctx.host().replace(/\/$/, '')}${BASE_TPL_PATH}`, params };
  },
  execute: async (ctx) => {
    const params: Record<string, string> = {};
    const locale = ctx.str('locale');
    if (locale) params.locale = locale;
    return kbApi(ctx, 'GET', BASE_TPL_PATH, params);
  },
};
