import { existsSync } from 'node:fs';
import {
  buildCapabilityGatewayUrl,
  dryRunCapability,
  executeCapabilityWithEnvelope,
  uploadInputFile,
  validateCapability,
} from '../../../../core/capability-api.js';
import { resolveGatewayDomain } from '../../../../core/capability-routing.js';
import { withOutputMetadata } from '../../../../framework/output.js';
import type { Command, RuntimeContext } from '../../../../framework/types.js';
import {
  compactInput,
  langFlag,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../shared.js';

const CAPABILITY_ID = 'tracking.plan.import_excel';
const INPUT_FILE_PURPOSE = 'track.program.xlsx';

export const trackingPlanImportExcel: Command = {
  service: 'tracking',
  resource: 'plan',
  command: 'import-excel',
  capabilityId: CAPABILITY_ID,
  description: 'Import a tracking plan XLSX. Pass --input-file for automatic upload with purpose '
    + 'track.program.xlsx, or --input-file-id from `analysis input-file upload`. '
    + 'List bundled XLSX templates with `tracking plan list-templates --json`.',
  flags: [
    projectIdFlag,
    {
      name: 'input-file',
      type: 'string',
      required: false,
      desc: 'Local tracking-plan XLSX path. The CLI uploads it with purpose track.program.xlsx before import.',
    },
    {
      name: 'input-file-id',
      type: 'string',
      required: false,
      desc: 'Existing input_file_id returned by `analysis input-file upload --purpose track.program.xlsx`.',
    },
    langFlag,
  ],
  risk: 'write',
  validate: validateSource,
  validateInput: async (ctx) => {
    const inputFile = optionalString(ctx, 'input-file');
    if (inputFile) {
      return {
        valid: true,
        capability_id: CAPABILITY_ID,
        normalized_input: buildInput(ctx, '<input_file_id returned by upload>'),
        upload: { purpose: INPUT_FILE_PURPOSE, file: inputFile },
      };
    }
    return validateCapability(ctx.host(), resolveGatewayDomain('analysis'), CAPABILITY_ID,
      buildInput(ctx, ctx.str('input-file-id')));
  },
  dryRun: async (ctx) => {
    const inputFile = optionalString(ctx, 'input-file');
    if (inputFile) {
      return {
        steps: [
          {
            method: 'POST',
            url: buildCapabilityGatewayUrl(ctx.host(), resolveGatewayDomain('analysis'), 'input-files'),
            body: { multipart: { project_id: ctx.num('project-id'), purpose: INPUT_FILE_PURPOSE, file: inputFile } },
          },
          {
            capability_id: CAPABILITY_ID,
            input: buildInput(ctx, '<input_file_id returned by upload>'),
          },
        ],
      };
    }
    return dryRunCapability(ctx.host(), resolveGatewayDomain('analysis'), CAPABILITY_ID,
      buildInput(ctx, ctx.str('input-file-id')));
  },
  execute: async (ctx) => {
    const inputFile = optionalString(ctx, 'input-file');
    let inputFileId = optionalString(ctx, 'input-file-id');
    if (inputFile) {
      const upload = await uploadInputFile(
        ctx.host(), resolveGatewayDomain('analysis'), ctx.num('project-id'), INPUT_FILE_PURPOSE, inputFile,
      );
      inputFileId = upload?.input_file_id ?? upload?.inputFileId;
      if (!inputFileId) {
        throw new Error('Input-file upload did not return input_file_id');
      }
    }
    const result = await executeCapabilityWithEnvelope(
      ctx.host(), resolveGatewayDomain('analysis'), CAPABILITY_ID, buildInput(ctx, inputFileId!),
    );
    return withOutputMetadata(result.data, result.meta);
  },
};

function validateSource(ctx: RuntimeContext): void {
  const inputFile = optionalString(ctx, 'input-file');
  const inputFileId = optionalString(ctx, 'input-file-id');
  if (Boolean(inputFile) === Boolean(inputFileId)) {
    throw new Error('Pass exactly one of --input-file or --input-file-id');
  }
  if (inputFile && (!existsSync(inputFile) || !inputFile.toLowerCase().endsWith('.xlsx'))) {
    throw new Error('--input-file must reference a readable .xlsx file');
  }
}

function buildInput(ctx: RuntimeContext, inputFileId: string): Record<string, unknown> {
  return compactInput({
    ...projectInput(ctx),
    input_file_id: inputFileId,
    lang: optionalString(ctx, 'lang'),
  });
}
