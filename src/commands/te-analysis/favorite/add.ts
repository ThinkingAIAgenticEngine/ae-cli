import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const favoriteAdd = createAnalysisCapabilityCommand({
  resource: 'favorite',
  command: 'add',
  capabilityId: 'analysis.favorite.add',
  description: 'Favorite one dashboard, BI panel, or folder.',
  flags: [
    projectIdFlag,
    { name: 'asset-id', type: 'number', required: true, desc: 'Dashboard, BI panel, or folder ID.' },
    { name: 'asset-type', type: 'string', required: true, desc: 'Asset type: dashboard, bi_panel, or folder.' },
    { name: 'space-id', type: 'number', required: false, desc: 'Project space ID when relevant.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    asset_id: ctx.num('asset-id'),
    asset_type: ctx.str('asset-type'),
    space_id: optionalNumber(ctx, 'space-id'),
  }),
});
