import {
  compactInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const projectSpaceBusinessFilterUpsert = createAnalysisCapabilityCommand({
  resource: 'project-space',
  command: 'business-filter-upsert',
  capabilityId: 'analysis.project_space.business_filter_upsert',
  description: 'Create or replace the space-level business filter inherited by dashboards in a project space.',
  flags: [
    projectIdFlag,
    { name: 'space-id', type: 'number', required: true, desc: 'Project space ID.' },
    { name: 'filter', type: 'json', required: true, desc: 'Space-level business filter in snake_case QP form. Pass {"junction_kind":"and","ta_filters":[]} to clear it.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    space_id: ctx.num('space-id'),
    filter: ctx.json('filter'),
  }),
});
