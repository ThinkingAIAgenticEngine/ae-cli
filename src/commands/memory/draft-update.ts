import type { Command } from '../../framework/types.js';
import { draftContentBody, MEMORY_SERVICE, targetDryRun, targetFlags, targetPatch, version } from './shared.js';

export const updateMemoryDraft: Command = {
  service: MEMORY_SERVICE,
  command: '+draft-update',
  description: 'Update a private memory draft',
  flags: [...targetFlags, { name: 'draft-id', type: 'string', required: true, desc: 'Draft ID' }, { name: 'version', type: 'number', required: true, desc: 'Current draft version' }, { name: 'title', type: 'string', required: false, desc: 'Replacement title' }, { name: 'content', type: 'string', required: true, maxLength: 4000, desc: 'Replacement content' }],
  risk: 'write',
  validate: version,
  dryRun: (ctx) => targetDryRun(ctx, 'PATCH', `drafts/${encodeURIComponent(ctx.str('draftId'))}`, draftContentBody(ctx)),
  execute: (ctx) => targetPatch(ctx, `drafts/${encodeURIComponent(ctx.str('draftId'))}`, draftContentBody(ctx)),
};
