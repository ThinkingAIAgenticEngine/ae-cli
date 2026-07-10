import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataDataTableInfluenceList = createAnalysisCapabilityCommand({
  resource: 'datatable',
  command: 'influence-list',
  capabilityId: 'metadata.data_table.influence_list',
  description: 'List metadata and assets affected by data table deletion or column changes.',
  flags: [
    projectIdFlag,
    { name: 'datatable-id', type: 'number', required: true, desc: 'Data table ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ ...projectInput(ctx), datatable_id: ctx.num('datatable-id') }),
});
