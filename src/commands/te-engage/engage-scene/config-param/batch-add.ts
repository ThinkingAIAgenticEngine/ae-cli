import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Batch-adds params to a config item. */
export const configParamBatchAdd = createEngageSceneCapabilityCommand({
  resource: 'config-param',
  command: 'batch-add',
  capabilityId: 'engage-scene.config-param.batch-add',
  description: 'Batch-add params to a config item.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    {
      name: 'params',
      type: 'json',
      required: true,
      desc: 'JSON array of params. Each: param_name, param_display_name, param_type, param_sub_type, table_id, param_placeholder, is_required, default_value.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    params: ctx.json('params'),
  }),
});
