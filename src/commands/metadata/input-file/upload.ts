import type { Command } from '../../../framework/types.js';
import { buildCapabilityGatewayUrl, uploadInputFile } from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';

const METADATA_CLI_SERVICE = 'metadata';

export const inputFileUpload: Command = {
  service: 'metadata',
  resource: 'input-file',
  command: 'upload',
  description: 'Upload a local file to the metadata capability gateway and return an input_file_id.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'purpose', type: 'string', required: true, desc: 'Input file purpose. For data table CSV imports, use data_table.csv.' },
    { name: 'file', type: 'string', required: true, desc: 'Local file path to upload.' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: buildCapabilityGatewayUrl(ctx.host(), resolveGatewayDomain(METADATA_CLI_SERVICE), 'input-files'),
    body: {
      multipart: {
        project_id: ctx.num('project-id'),
        purpose: ctx.str('purpose'),
        file: ctx.str('file'),
      },
    },
  }),
  execute: async (ctx) => uploadInputFile(
    ctx.host(),
    resolveGatewayDomain(METADATA_CLI_SERVICE),
    ctx.num('project-id'),
    ctx.str('purpose'),
    ctx.str('file'),
  ),
};
