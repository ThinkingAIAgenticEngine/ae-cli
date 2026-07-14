import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataSuperMetadataExport = createAnalysisMetaCapabilityCommand({
  resource: 'super-metadata',
  command: 'export',
  capabilityId: 'metadata.super_metadata.export',
  description: 'Export super event and super property configuration as an asynchronous XLSX artifact.',
  flags: [
    projectIdFlag,
    { name: 'request-id', type: 'string', required: false, desc: 'Optional cli_<32 lowercase hex> request ID. Generated when omitted.' },
    { name: 'timeout-seconds', type: 'number', required: false, desc: 'Export timeout seconds. Default: 3600, max: 7200.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    request_id: optionalString(ctx, 'request-id'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  }),
});
