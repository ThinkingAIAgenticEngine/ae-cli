import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalNumber,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const folderCreate = createAnalysisCapabilityCommand({
  resource: 'folder',
  command: 'create',
  capabilityId: 'analysis.folder.create',
  description: 'Create a folder in personal space or project space.',
  flags: [
    projectIdFlag,
    { name: 'folder-name', type: 'string', required: true, desc: 'Folder name.' },
    { name: 'space-id', type: 'number', required: false, desc: 'Project space ID. Omit for personal space.' },
    { name: 'parent-folder-id', type: 'number', required: false, desc: 'Parent project-space folder ID.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    folder_name: ctx.str('folder-name'),
    space_id: optionalNumber(ctx, 'space-id'),
    parent_folder_id: optionalNumber(ctx, 'parent-folder-id'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
