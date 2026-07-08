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

export const dashboardDailyReportUpdate = createAnalysisCapabilityCommand({
  resource: 'dashboard-daily-report',
  command: 'update',
  capabilityId: 'analysis.dashboard_daily_report.update',
  description: 'Update dashboard daily report configuration.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard ID.' },
    { name: 'enable-send', type: 'number', required: false, desc: 'Enable send flag.' },
    { name: 'send-time', type: 'string', required: false, desc: 'Daily report send time.' },
    { name: 'send-title', type: 'string', required: false, desc: 'Daily report title.' },
    { name: 'send-content', type: 'string', required: false, desc: 'Daily report content.' },
    payloadFlag,
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    enable_send: optionalNumber(ctx, 'enable-send'),
    send_time: optionalString(ctx, 'send-time'),
    send_title: optionalString(ctx, 'send-title'),
    send_content: optionalString(ctx, 'send-content'),
    payload: optionalJson(ctx, 'payload'),
  }),
});
