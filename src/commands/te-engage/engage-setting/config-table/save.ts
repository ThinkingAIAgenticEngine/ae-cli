import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Saves a previously uploaded and parsed config table (by request_id) as a named config table; returns its info_id. */
export const configTableSave = createEngageSettingCapabilityCommand({
  resource: 'config-table',
  command: 'save',
  capabilityId: 'engage-setting.config-table.save',
  description: 'Save a previously uploaded and parsed config table (by request_id) as a named config table; returns its info_id.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'request-id', type: 'string', required: true, desc: 'Request id returned by a prior upload.' },
    { name: 'info-name', type: 'string', required: true, desc: 'Config table name.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    request_id: ctx.str('request-id'),
    info_name: ctx.str('info-name'),
  }),
});
