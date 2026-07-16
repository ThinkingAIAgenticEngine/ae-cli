import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const reportAbnormalGet = createAnalysisCapabilityCommand({
  resource: 'report-abnormal',
  command: 'get',
  capabilityId: 'analysis.report_abnormal.get',
  description: 'Get abnormal asset information for one analysis report.',
  flags: [projectIdFlag, { name: 'report-id', type: 'number', required: true, desc: 'Report ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    report_id: ctx.num('report-id'),
  }),
});
