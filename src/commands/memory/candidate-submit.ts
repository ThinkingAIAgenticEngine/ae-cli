import type { Command } from '../../framework/types.js';
import { candidateBody, MEMORY_SERVICE, targetDryRun, targetFlags, targetPost } from './shared.js';

export const submitMemoryCandidate: Command = {
  service: MEMORY_SERVICE,
  command: '+candidate-submit',
  description: 'Submit a new or replacement memory candidate to a shared AgentSpace',
  flags: [...targetFlags, { name: 'title', type: 'string', required: false, desc: 'Optional candidate title' }, { name: 'content', type: 'string', required: true, maxLength: 4000, desc: 'Candidate content' }, { name: 'target-memory-id', type: 'string', required: false, desc: 'Existing memory ID for a replacement proposal' }, { name: 'target-memory-version', type: 'number', required: false, min: 1, desc: 'Current version of the replacement target' }],
  risk: 'write',
  validate: candidateBody,
  dryRun: (ctx) => targetDryRun(ctx, 'POST', 'candidates', candidateBody(ctx)),
  execute: (ctx) => targetPost(ctx, 'candidates', candidateBody(ctx)),
};
