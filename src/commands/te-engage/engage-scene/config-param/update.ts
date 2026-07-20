import { createEngageSceneCapabilityCommand } from '../../shared.js';

/** Updates a config item param. */
export const configParamUpdate = createEngageSceneCapabilityCommand({
  resource: 'config-param',
  command: 'update',
  capabilityId: 'engage-scene.config-param.update',
  description: 'Update a config item param.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'config-id', type: 'string', required: true, desc: 'Config item ID.' },
    { name: 'param-id', type: 'number', required: true, desc: 'Param ID to update.' },
    { name: 'param-name', type: 'string', required: false, desc: 'Param name (<=80 chars).' },
    { name: 'param-display-name', type: 'string', required: false, desc: 'Param display name (<=80 chars).' },
    { name: 'param-type', type: 'string', required: false, desc: 'Param type (see ConfigParamsTypeEnum).' },
    { name: 'param-sub-type', type: 'string', required: false, desc: 'Param sub type (see ConfigParamsSubTypeEnum).' },
    { name: 'table-id', type: 'string', required: false, desc: 'Config table ID (for single-select params).' },
    { name: 'param-placeholder', type: 'string', required: false, desc: 'Param placeholder text (<=80 chars).' },
    { name: 'is-required', type: 'number', required: false, desc: 'Whether required: 1 yes, 0 no.' },
    { name: 'default-value', type: 'string', required: false, desc: 'Default value.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    config_id: ctx.str('config-id'),
    param_id: ctx.num('param-id'),
    param_name: ctx.str('param-name') || undefined,
    param_display_name: ctx.str('param-display-name') || undefined,
    param_type: ctx.str('param-type') || undefined,
    param_sub_type: ctx.str('param-sub-type') || undefined,
    table_id: ctx.str('table-id') || undefined,
    param_placeholder: ctx.str('param-placeholder') || undefined,
    is_required: ctx.optionalNum('is-required'),
    default_value: ctx.str('default-value') || undefined,
  }),
});
