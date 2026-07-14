import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataSuperMetadataImport = createAnalysisMetaCapabilityCommand({
  resource: 'super-metadata',
  command: 'import',
  capabilityId: 'metadata.super_metadata.import',
  description: 'Pre-import and confirm-import super event and super property configuration.',
  flags: [
    projectIdFlag,
    { name: 'operation', type: 'string', required: true, desc: 'Import step: pre_import or ensure_import.' },
    { name: 'input-file-id', type: 'string', required: false, desc: 'Uploaded XLSX input file ID for pre_import. Upload with purpose=super_metadata.import.xlsx.' },
    { name: 'pre-import-meta-uuid', type: 'string', required: false, desc: 'UUID returned by pre_import, required for ensure_import.' },
  ],
  risk: 'write',
  buildInput: (ctx) => (compactInput({
    ...projectInput(ctx),
    operation: ctx.str('operation'),
    input_file_id: optionalString(ctx, 'input-file-id'),
    pre_import_meta_uuid: optionalString(ctx, 'pre-import-meta-uuid'),
  })),
});
