import {
  createAnalysisCapabilityCommand,
  jsonArray,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const reportDelete = createAnalysisCapabilityCommand({
  resource: 'report',
  command: 'delete',
  capabilityId: 'analysis.report.delete',
  description: 'Delete one or more analysis reports.',
  flags: [projectIdFlag, { name: 'report-ids', type: 'json', required: true, desc: 'Report ID array.' }],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    report_ids: jsonArray(ctx, 'report-ids'),
  }),
});
