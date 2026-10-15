import {
  compactInput,
  createAnalysisCapabilityCommand,
  jsonArray,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardMove = createAnalysisCapabilityCommand({
  resource: 'dashboard',
  command: 'move',
  capabilityId: 'analysis.dashboard.move',
  description:
    'Move one or more dashboards to the same project-space root or folder.',
  flags: [
    projectIdFlag,
    {
      name: 'dashboard-ids',
      type: 'json',
      required: true,
      desc: 'Dashboard ID array. Pass a one-item array to move a single dashboard.',
    },
    {
      name: 'to-space-id',
      type: 'number',
      required: true,
      desc: 'Target project space ID.',
    },
    {
      name: 'to-folder-id',
      type: 'number',
      required: false,
      desc: 'Target folder ID within the target project space. Omit to move to the space root.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) =>
    compactInput({
      ...projectInput(ctx),
      dashboard_ids: jsonArray(ctx, 'dashboard-ids'),
      to_space_id: ctx.num('to-space-id'),
      to_folder_id: optionalNumber(ctx, 'to-folder-id'),
    }),
});
