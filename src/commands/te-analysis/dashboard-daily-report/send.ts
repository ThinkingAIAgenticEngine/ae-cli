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

export const dashboardDailyReportSend = createAnalysisCapabilityCommand({
  resource: 'dashboard-daily-report',
  command: 'send',
  capabilityId: 'analysis.dashboard_daily_report.send',
  description: 'Send dashboard daily report immediately.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    { name: 'need-csv', type: 'number', required: false, desc: 'Whether CSV attachment is needed.' },
    { name: 'host-url', type: 'string', required: false, desc: 'Host URL used in report links.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    need_csv: optionalNumber(ctx, 'need-csv'),
    host_url: optionalString(ctx, 'host-url'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
