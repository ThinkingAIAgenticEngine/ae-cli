import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const reportGet = createAnalysisCapabilityCommand({
  resource: 'report',
  command: 'get',
  capabilityId: 'analysis.report.get',
  description: 'Get one analysis report definition as AI QP without executing report data.',
  flags: [projectIdFlag, { name: 'report-id', type: 'number', required: true, desc: 'Report ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    report_id: ctx.num('report-id'),
  }),
});
