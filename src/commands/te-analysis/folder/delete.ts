import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJsonArray,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const folderDelete = createAnalysisCapabilityCommand({
  resource: 'folder',
  command: 'delete',
  capabilityId: 'analysis.folder.delete',
  description: 'Delete one or more folders.',
  flags: [
    projectIdFlag,
    { name: 'folder-id', type: 'number', required: false, desc: 'Folder ID.' },
    { name: 'folder-ids', type: 'json', required: false, desc: 'Folder ID array.' },
    { name: 'space-id', type: 'number', required: false, desc: 'Project space ID for project-space folders. Omit for personal folders.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    folder_id: optionalNumber(ctx, 'folder-id'),
    folder_ids: optionalJsonArray(ctx, 'folder-ids'),
    space_id: optionalNumber(ctx, 'space-id'),
  }),
});
