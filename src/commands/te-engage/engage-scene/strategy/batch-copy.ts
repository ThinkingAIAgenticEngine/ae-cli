import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Batch-copies config strategies. */
export const strategyBatchCopy = createEngageSceneCapabilityCommand({
  resource: 'strategy',
  command: 'batch-copy',
  capabilityId: 'engage-scene.strategy.batch-copy',
  description: 'Batch-copy config strategies.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'strategy-ids', type: 'json', required: true, desc: 'JSON array of strategy IDs to copy.' },
    { name: 'op-mode', type: 'string', required: false, desc: 'Operation mode: batch or single. Defaults to batch.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    strategy_ids: ctx.json('strategy-ids'),
    op_mode: ctx.str('op-mode') || undefined,
  }),
});
