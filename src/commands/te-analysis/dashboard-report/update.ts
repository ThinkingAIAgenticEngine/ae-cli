import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const dashboardReportUpdate = createAnalysisCapabilityCommand({
  resource: 'dashboard-report',
  command: 'update',
  capabilityId: 'analysis.dashboard_report.update',
  description: 'Update one analysis-board report card frame size or grid position, or an event card presentation, without changing its source definition or other dashboards.',
  flags: [
    projectIdFlag,
    { name: 'dashboard-id', type: 'number', required: true, desc: 'Dashboard containing the report card.' },
    { name: 'report-id', type: 'number', required: true, desc: 'Existing report ID on that dashboard. Chart and table settings require an event report.' },
    { name: 'frame-size', type: 'string', required: false, desc: 'Card frame size: medium or large. Omit to preserve. Requires the current --reports-version from dashboard-report get.' },
    { name: 'position-x', type: 'number', required: false, desc: 'Zero-based horizontal grid coordinate, 0..19 on a 20-column board. Supply with --position-y and --reports-version. Must fit the saved card width; occupied destinations are rejected.' },
    { name: 'position-y', type: 'number', required: false, desc: 'Zero-based vertical grid coordinate, 0..10000, not pixels. Supply with --position-x and --reports-version. Requires an initialized saved board layout; the page may vertically compact gaps.' },
    { name: 'reports-version', type: 'number', required: false, desc: 'Fresh dashboard layout version from dashboard-report get. Required for frame-size or position changes; stale versions are rejected without partial writes. This is not the source report version.' },
    { name: 'chart-type', type: 'string', required: false, desc: 'Card chart type: line, combo, bar, stacked, cumulative, pie, or table. Combo inherits existing source-report series; this command cannot edit series. A pure line card requires resetting source combo first. Gateway validates compatibility with the saved event definition.' },
    { name: 'table-layout', type: 'string', required: false, desc: 'Table layout: date, event, or group. Omit to preserve it.' },
    { name: 'date-outside', type: 'boolean', required: false, desc: 'Show dates outside the table. True requires a grouped table with a non-date layout; also choose event/group layout when inherited. Pass false to clear, omit to preserve.' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const chartType = optionalString(ctx, 'chart-type');
    const tableLayout = optionalString(ctx, 'table-layout');
    const dateOutside = optionalBoolean(ctx, 'date-outside');
    const frameSize = optionalString(ctx, 'frame-size');
    const x = optionalNumber(ctx, 'position-x');
    const y = optionalNumber(ctx, 'position-y');
    const version = optionalNumber(ctx, 'reports-version');
    if (frameSize !== undefined && !['medium', 'large'].includes(frameSize)) {
      throw new Error('--frame-size must be medium or large.');
    }
    if ((x === undefined) !== (y === undefined)) {
      throw new Error('--position-x and --position-y must be supplied together.');
    }
    for (const [name, value] of [['position-x', x], ['position-y', y], ['reports-version', version]] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
        throw new Error(`--${name} must be a non-negative safe integer.`);
      }
    }
    if (x !== undefined && x >= 20) {
      throw new Error('--position-x must be between 0 and 19 and fit the saved card width.');
    }
    if (y !== undefined && y > 10000) {
      throw new Error('--position-y must be between 0 and 10000.');
    }
    if (version === Number.MAX_SAFE_INTEGER) {
      throw new Error('--reports-version must be safely incrementable; reread the dashboard version.');
    }
    if ((frameSize !== undefined || x !== undefined) && version === undefined) {
      throw new Error('--reports-version from dashboard-report get is required for frame-size or position changes.');
    }
    if (chartType === undefined && tableLayout === undefined && dateOutside === undefined && frameSize === undefined && x === undefined) {
      throw new Error('At least one of --chart-type, --table-layout, --date-outside, --frame-size, or --position-x/--position-y is required.');
    }
    if (chartType !== undefined && !['line', 'combo', 'bar', 'stacked', 'cumulative', 'pie', 'table'].includes(chartType)) {
      throw new Error('--chart-type must be line, combo, bar, stacked, cumulative, pie, or table.');
    }
    if (tableLayout !== undefined && !['date', 'event', 'group'].includes(tableLayout)) {
      throw new Error('--table-layout must be date, event, or group.');
    }
  },
  buildInput: (ctx) => {
    const presentation = compactInput({
      chart_type: optionalString(ctx, 'chart-type'),
      table_layout: optionalString(ctx, 'table-layout'),
      date_outside: optionalBoolean(ctx, 'date-outside'),
    });
    const x = optionalNumber(ctx, 'position-x');
    return compactInput({
      ...projectInput(ctx),
      dashboard_id: ctx.num('dashboard-id'),
      report_id: ctx.num('report-id'),
      frame_size: optionalString(ctx, 'frame-size'),
      position: x === undefined ? undefined : { x, y: optionalNumber(ctx, 'position-y') },
      reports_version: optionalNumber(ctx, 'reports-version'),
      presentation: Object.keys(presentation).length === 0 ? undefined : presentation,
    });
  },
});
