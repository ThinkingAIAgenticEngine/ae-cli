import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  payloadFlag,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const folderShare = createAnalysisCapabilityCommand({
  resource: 'folder',
  command: 'share',
  capabilityId: 'analysis.folder.share',
  description: 'Modify folder sharing members.',
  flags: [projectIdFlag, { name: 'folder-id', type: 'number', required: true, desc: 'Folder ID.' }, payloadFlag],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    folder_id: ctx.num('folder-id'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
