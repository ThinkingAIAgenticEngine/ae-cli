import type { Command } from '../../../framework/types.js';
import { buildCapabilityGatewayUrl, uploadInputFile } from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';

export const inputFileUpload: Command = {
  service: 'analysis',
  resource: 'input-file',
  command: 'upload',
  description: 'Upload a local file to the analysis capability gateway and return an input_file_id.',
  flags: [
    { name: 'project-id', type: 'number', required: true, desc: 'Numeric project ID.', alias: 'p' },
    { name: 'purpose', type: 'string', required: true, desc: 'Purpose returned by analysis input-file purpose list.' },
    { name: 'file', type: 'string', required: true, desc: 'Local file path to upload.' },
  ],
  risk: 'write',
  dryRun: (ctx) => ({
    method: 'POST',
    url: buildCapabilityGatewayUrl(ctx.host(), resolveGatewayDomain('analysis'), 'input-files'),
    body: {
      multipart: {
        project_id: ctx.num('project-id'),
        purpose: ctx.str('purpose'),
        file: ctx.str('file'),
      },
    },
  }),
  execute: async (ctx) => {
    const result = await uploadInputFile(
      ctx.host(),
      resolveGatewayDomain('analysis'),
      ctx.num('project-id'),
      ctx.str('purpose'),
      ctx.str('file'),
    );
    const inputFileId = result?.input_file_id ?? result?.inputFileId;
    return {
      ...result,
      inspect_path: typeof inputFileId === 'string'
        ? `/api/cli/analysis/v1/input-files/${inputFileId}`
        : result?.inspect_path,
      inspect_command: typeof inputFileId === 'string'
        ? `ae-cli analysis input-file inspect --input-file-id ${inputFileId}`
        : undefined,
    };
  },
};
