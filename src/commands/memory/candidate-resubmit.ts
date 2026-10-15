import type { Command } from '../../framework/types.js';
import { compact, MEMORY_SERVICE, optional, targetDryRun, targetFlags, targetPost, version } from './shared.js';

function body(ctx: Parameters<NonNullable<Command['execute']>>[0]) {
  return compact({ version: version(ctx), title: optional(ctx, 'title'), content: ctx.str('content'), scopeType: 'space', agentId: null });
}

export const resubmitMemoryCandidate: Command = {
  service: MEMORY_SERVICE,
  command: '+candidate-resubmit',
  description: 'Resubmit a rejected, withdrawn, or conflicted memory candidate',
  flags: [...targetFlags, { name: 'candidate-id', type: 'string', required: true, desc: 'Previous candidate ID' }, { name: 'version', type: 'number', required: true, desc: 'Current candidate version' }, { name: 'title', type: 'string', required: false, desc: 'Replacement title' }, { name: 'content', type: 'string', required: true, maxLength: 4000, desc: 'Replacement content' }],
  risk: 'write',
  validate: version,
  dryRun: (ctx) => targetDryRun(ctx, 'POST', `candidates/${encodeURIComponent(ctx.str('candidateId'))}/resubmit`, body(ctx)),
  execute: (ctx) => targetPost(ctx, `candidates/${encodeURIComponent(ctx.str('candidateId'))}/resubmit`, body(ctx)),
};
