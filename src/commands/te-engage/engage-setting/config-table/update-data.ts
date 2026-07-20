import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Replaces an existing config table's data with a freshly uploaded file (by request_id) for the given info_id. */
export const configTableUpdateData = createEngageSettingCapabilityCommand({
  resource: 'config-table',
  command: 'update-data',
  capabilityId: 'engage-setting.config-table.update-data',
  description: "Replace an existing config table's data with a freshly uploaded file (by request_id) for the given info_id.",
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'request-id', type: 'string', required: true, desc: 'Request id returned by a prior upload.' },
    { name: 'info-name', type: 'string', required: true, desc: 'Config table name.' },
    { name: 'info-id', type: 'number', required: true, desc: 'Config table ID to update.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    request_id: ctx.str('request-id'),
    info_name: ctx.str('info-name'),
    info_id: ctx.num('info-id'),
  }),
});
