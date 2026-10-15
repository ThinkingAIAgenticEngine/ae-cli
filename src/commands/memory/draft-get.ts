import type { Command } from '../../framework/types.js';
import { MEMORY_SERVICE, targetDryRun, targetFlags, targetGet } from './shared.js';

export const getMemoryDraft: Command = {
  service: MEMORY_SERVICE,
  command: '+draft-get',
  description: 'Get one private memory draft',
  flags: [...targetFlags, { name: 'draft-id', type: 'string', required: true, desc: 'Draft ID' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `drafts/${encodeURIComponent(ctx.str('draftId'))}`),
  execute: (ctx) => targetGet(ctx, `drafts/${encodeURIComponent(ctx.str('draftId'))}`),
};
