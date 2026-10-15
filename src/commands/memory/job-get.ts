import type { Command } from '../../framework/types.js';
import { MEMORY_SERVICE, targetDryRun, targetFlags, targetGet } from './shared.js';

export const getMemoryJob: Command = {
  service: MEMORY_SERVICE,
  command: '+job-get',
  description: 'Get one AgentSpace memory extraction job',
  flags: [...targetFlags, { name: 'job-id', type: 'string', required: true, desc: 'Extraction job ID returned by +extract or +job-list' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `jobs/${encodeURIComponent(ctx.str('jobId'))}`),
  execute: (ctx) => targetGet(ctx, `jobs/${encodeURIComponent(ctx.str('jobId'))}`),
};
