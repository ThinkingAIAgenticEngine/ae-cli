import { createEngageSettingCapabilityCommand } from '../../shared.js';

/** Uploads and parses a config-table file (base64-encoded content) for a project; returns the parsed data preview keyed by request_id. */
export const configTableUpload = createEngageSettingCapabilityCommand({
  resource: 'config-table',
  command: 'upload',
  capabilityId: 'engage-setting.config-table.upload',
  description: 'Upload and parse a config-table file (base64-encoded content) for a project; returns the parsed data preview keyed by request_id.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    {
      name: 'request-id',
      type: 'string',
      required: true,
      desc: 'Client-supplied request id used to cache parsed rows for the subsequent save/update-data.',
    },
    { name: 'file-name', type: 'string', required: true, desc: 'Original file name including extension (.csv/.xlsx).' },
    {
      name: 'file-content',
      type: 'string',
      required: true,
      desc: 'Base64-encoded file content. Tip: base64 < file.csv | pbcopy on macOS.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    request_id: ctx.str('request-id'),
    file_name: ctx.str('file-name'),
    file_content: ctx.str('file-content'),
  }),
});
