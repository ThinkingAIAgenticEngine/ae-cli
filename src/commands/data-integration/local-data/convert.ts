import type { Command } from '../../../framework/types.js';
import { convertLocalData, convertLocalDataMulti } from './conversion.js';
import { readLocalDataMapping } from './mapping.js';

export const dataIntegrationConvert: Command = {
  service: 'data-integration',
  command: 'convert',
  usesAeHost: false,
  description: 'Convert one or more local data sets into validated UE JSONL and quarantine invalid rows.',
  flags: [
    { name: 'input-file', type: 'string', required: true, sensitive: true, variadic: true, desc: 'Source local data file. Repeat for multiple files (requires a wildcard mapping). The source is never modified.' },
    { name: 'mapping', type: 'string', required: true, sensitive: true, desc: 'ae-local-data-mapping/v1 JSON, file path, or @file.' },
    { name: 'output-dir', type: 'string', sensitive: true, desc: 'New or empty output directory. Default: .ae-cli/data-integration/<run-id>.' },
    { name: 'type-resolutions', type: 'json', sensitive: true, desc: 'JSON object resolving cross-file column type conflicts (unify, split, or skip).' },
    { name: 'merge-sheets', type: 'boolean', default: false, desc: 'Stream every worksheet in file order instead of a single selected sheet.' },
    { name: 'salvage-from', type: 'string', sensitive: true, desc: 'Re-process only the rows listed in a previous run\'s invalid.rows.jsonl, against the current (fixed) mapping. Single-file only.' },
  ],
  risk: 'write',
  dryRun: async (ctx) => {
    const inputFiles = ctx.list('input-file');
    const multi = inputFiles.length > 1;
    const mapping = readLocalDataMapping(ctx.str('mapping'), { sourceWildcard: multi });
    if (multi) {
      return {
        action: 'convert_local_data_multi',
        file_count: inputFiles.length,
        source_sha256: mapping.source.sha256,
        mode: mapping.mode,
        property_count: mapping.properties.length,
        type_resolutions: ctx.json('type-resolutions') ?? {},
        source_files_unchanged: true,
      };
    }
    return {
      action: 'convert_local_data',
      source_sha256: mapping.source.sha256,
      data_set: mapping.source.data_set,
      mode: mapping.mode,
      property_count: mapping.properties.length,
      salvage_from: ctx.str('salvage-from').trim() || undefined,
      source_file_unchanged: true,
    };
  },
  execute: async (ctx) => {
    const inputFiles = ctx.list('input-file');
    const outputDir = ctx.str('output-dir').trim() || undefined;
    if (inputFiles.length === 1) {
      return convertLocalData({
        inputFile: inputFiles[0],
        mapping: readLocalDataMapping(ctx.str('mapping')),
        outputDir,
        mergeSheets: ctx.bool('merge-sheets'),
        salvageFrom: ctx.str('salvage-from').trim() || undefined,
      });
    }
    return convertLocalDataMulti({
      inputFiles,
      mapping: readLocalDataMapping(ctx.str('mapping'), { sourceWildcard: true }),
      typeResolutions: ctx.json('type-resolutions') ?? {},
      outputDir,
    });
  },
};
