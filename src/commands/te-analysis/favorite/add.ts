import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalNumber,
  optionalString,
  payloadFlag,
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
    { name: 'asset-id', type: 'number', required: false, desc: 'Asset ID.' },
    { name: 'asset-type', type: 'string', required: false, desc: 'Asset type, for example dashboard, bi_panel, or folder.' },
    { name: 'space-id', type: 'number', required: false, desc: 'Project space ID when relevant.' },
    { name: 'id', type: 'number', required: false, desc: 'Backend DTO ID field when required.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    asset_id: optionalNumber(ctx, 'asset-id'),
    asset_type: optionalString(ctx, 'asset-type'),
    space_id: optionalNumber(ctx, 'space-id'),
    id: optionalNumber(ctx, 'id'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
