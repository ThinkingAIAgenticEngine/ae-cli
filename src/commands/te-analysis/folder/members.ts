import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const folderMembers = createAnalysisCapabilityCommand({
  resource: 'folder',
  command: 'members',
  capabilityId: 'analysis.folder.members',
  description: 'Get folder members.',
  flags: [projectIdFlag, { name: 'folder-id', type: 'number', required: true, desc: 'Folder ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    folder_id: ctx.num('folder-id'),
  }),
});
