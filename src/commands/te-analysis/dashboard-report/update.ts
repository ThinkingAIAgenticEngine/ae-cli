import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardReportUpdate = createAnalysisCapabilityCommand({
  resource: 'dashboard-report',
  command: 'update',
  capabilityId: 'analysis.dashboard_report.update',
  description: 'Update one event report card presentation without changing the source report definition or other dashboards.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard containing the report card.' },
    { name: 'report-id', type: 'number', required: true, desc: 'Existing event report ID on that dashboard.' },
    { name: 'chart-type', type: 'string', required: false, desc: 'Card chart type: line, combo, bar, stacked, cumulative, pie, or table. Combo inherits existing source-report series; this command cannot edit series. A pure line card requires resetting source combo first. Gateway validates compatibility with the saved event definition.' },
    { name: 'table-layout', type: 'string', required: false, desc: 'Table layout: date, event, or group. Omit to preserve it.' },
    { name: 'date-outside', type: 'boolean', required: false, desc: 'Show dates outside the table. True requires a grouped table with a non-date layout; also choose event/group layout when inherited. Pass false to clear, omit to preserve.' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const chartType = optionalString(ctx, 'chart-type');
    const tableLayout = optionalString(ctx, 'table-layout');
    const dateOutside = optionalBoolean(ctx, 'date-outside');
    if (chartType === undefined && tableLayout === undefined && dateOutside === undefined) {
      throw new Error('At least one of --chart-type, --table-layout, or --date-outside is required.');
    }
    if (chartType !== undefined && !['line', 'combo', 'bar', 'stacked', 'cumulative', 'pie', 'table'].includes(chartType)) {
      throw new Error('--chart-type must be line, combo, bar, stacked, cumulative, pie, or table.');
    }
    if (tableLayout !== undefined && !['date', 'event', 'group'].includes(tableLayout)) {
      throw new Error('--table-layout must be date, event, or group.');
    }
  },
  buildInput: (ctx) => ({
    ...projectInput(ctx),
    dashboard_id: ctx.num('dashboard-id'),
    report_id: ctx.num('report-id'),
    presentation: compactInput({
      chart_type: optionalString(ctx, 'chart-type'),
      table_layout: optionalString(ctx, 'table-layout'),
      date_outside: optionalBoolean(ctx, 'date-outside'),
    }),
  }),
});
