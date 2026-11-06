import type { Command } from '../../../framework/types.js';
import { buildCapabilityGatewayUrl, requestCapabilityGateway } from '../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../core/capability-routing.js';

export const inputFileInspect: Command = {
  service: 'analysis',
  resource: 'input-file',
  command: 'inspect',
  description: 'Inspect an uploaded analysis input file owned by the current user.',
  flags: [
    { name: 'input-file-id', type: 'string', required: true, desc: 'Uploaded input file ID, for example ifile_<32 lowercase hex>.' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: buildCapabilityGatewayUrl(ctx.host(), resolveGatewayDomain('analysis'), `input-files/${ctx.str('input-file-id')}`),
  }),
  execute: async (ctx) => {
    const inputFileId = ctx.str('input-file-id');
    const result = await requestCapabilityGateway(
      ctx.host(),
      resolveGatewayDomain('analysis'),
      `input-files/${inputFileId}`,
    );
    return {
      ...result,
      inspect_path: new URL(buildCapabilityGatewayUrl(ctx.host(), resolveGatewayDomain('analysis'), `input-files/${inputFileId}`)).pathname,
      inspect_command: `ae-cli analysis input-file inspect --input-file-id ${inputFileId}`,
    };
  },
};
