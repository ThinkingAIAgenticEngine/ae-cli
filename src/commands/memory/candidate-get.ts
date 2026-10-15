import type { Command } from '../../framework/types.js';
import { MEMORY_SERVICE, targetDryRun, targetFlags, targetGet } from './shared.js';

export const getMemoryCandidate: Command = {
  service: MEMORY_SERVICE,
  command: '+candidate-get',
  description: 'Get one shared AgentSpace memory candidate',
  flags: [...targetFlags, { name: 'candidate-id', type: 'string', required: true, desc: 'Candidate ID' }],
  risk: 'read',
  dryRun: (ctx) => targetDryRun(ctx, 'GET', `candidates/${encodeURIComponent(ctx.str('candidateId'))}`),
  execute: (ctx) => targetGet(ctx, `candidates/${encodeURIComponent(ctx.str('candidateId'))}`),
};
