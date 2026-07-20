import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Deletes a custom client parameter by column_name; returns the list of tasks still referencing it. */
export const clientParamDelete = createEngageSettingCapabilityCommand({
  resource: 'client-param',
  command: 'delete',
  capabilityId: 'engage-setting.client-param.delete',
  description: 'Delete a custom client parameter by column_name; returns the list of tasks still referencing it.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'column-name', type: 'string', required: true, desc: 'Client param column name to delete.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    column_name: ctx.str('column-name'),
  }),
});
