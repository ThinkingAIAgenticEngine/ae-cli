import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const reportVersionRollback = createAnalysisCapabilityCommand({
  resource: 'report-version',
  command: 'rollback',
  capabilityId: 'analysis.report_version.rollback',
  description: 'Rollback an analysis report to a previous history version.',
  flags: [
    projectIdFlag,
    { name: 'report-id', type: 'number', required: true, desc: 'Report ID.' },
    { name: 'target-version', type: 'number', required: true, desc: 'History version to rollback to.' },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    report_id: ctx.num('report-id'),
    version: ctx.num('target-version'),
  }),
});
