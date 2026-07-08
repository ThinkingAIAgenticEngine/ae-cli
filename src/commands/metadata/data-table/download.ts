import { createCapabilityCommand, optionalNumber, optionalString } from '../shared.js';

export const dataTableDownload = createCapabilityCommand({
  resource: 'data-table',
  command: 'download',
  capabilityId: 'metadata.data_table.download',
  description: 'Download a metadata data table export artifact.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'data-table-id', type: 'number', required: true, desc: 'Data table ID.' },
    { name: 'request-id', type: 'string', required: false, desc: 'Optional request ID. Format: cli_<32 lowercase hex>.' },
    { name: 'timeout-seconds', type: 'number', required: false, desc: 'Optional timeout in seconds. Range: 1 to 7200.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    data_table_id: ctx.num('data-table-id'),
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  }),
});
