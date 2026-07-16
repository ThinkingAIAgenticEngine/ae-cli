import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const reportChangeLogGet = createAnalysisCapabilityCommand({
  resource: 'report-change-log',
  command: 'get',
  capabilityId: 'analysis.report_change_log.get',
  description: 'Get one report change log detail as an AI QP definition when available.',
  flags: [
    projectIdFlag,
    { name: 'report-id', type: 'number', required: true, desc: 'Report ID.' },
    { name: 'history-version', type: 'number', required: false, desc: 'Optional history version. Omit for latest.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    report_id: ctx.num('report-id'),
    version: optionalNumber(ctx, 'history-version'),
  }),
});
