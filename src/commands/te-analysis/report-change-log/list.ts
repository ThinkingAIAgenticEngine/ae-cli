import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const reportChangeLogList = createAnalysisCapabilityCommand({
  resource: 'report-change-log',
  command: 'list',
  capabilityId: 'analysis.report_change_log.list',
  description: 'List change logs for one analysis report.',
  flags: [projectIdFlag, { name: 'report-id', type: 'number', required: true, desc: 'Report ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    report_id: ctx.num('report-id'),
  }),
});
