import type { Flag, RuntimeContext } from '../../../framework/types.js';
import { displayFields, validateDisplayPresentation } from './display.js';

export const reportPresentationFlag: Flag = {
  name: 'presentation',
  type: 'json',
  required: false,
  desc: 'For report update, ordinary-model display intent also accepts show_values, date_annotations, sort, retention, funnel, pie and interval; use report_presentation.md for applicability. Omitted fields preserve; null is not a reset. Create keeps the original event-only fields. Optional top-level event-report display JSON: chart_type (line|combo|bar|stacked|cumulative|pie), table_layout (date|event|group), series [{metric_index:1,type:"bar"|"line",axis:"primary"|"secondary"}]. Line/combo/cumulative require a non-total time_particle_size. Metric indexes are 1-based definition.metrics positions. Series is a subset patch; [] resets all series, and chart_type=line resets to pure primary-axis lines. Omit to preserve the saved chart/result-table layout on same-model updates. For a dashboard table card use analysis dashboard-report update --chart-type table.',
};

export function validateReportPresentation(ctx: RuntimeContext, allowDisplay = false): void {
  if (!(ctx.has?.('presentation') ?? ctx.str('presentation') !== '')) return;
  const value: unknown = ctx.json('presentation');
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('--presentation must be a non-empty event-report display object.');
  }
  const presentation = value as Record<string, unknown>;
  const keys = Object.keys(presentation);
  const legacyFields = ['chart_type', 'table_layout', 'series'];
  const fields: readonly string[] = allowDisplay ? [...legacyFields, ...displayFields] : legacyFields;
  if (keys.length === 0 || keys.some((key) => !fields.includes(key))) {
    throw new Error(`--presentation accepts only ${fields.join(', ')}; use semantic names, not raw QP fields.`);
  }
  if (presentation.chart_type === 'table') {
    throw new Error('A table is a dashboard card display; use analysis dashboard-report update --chart-type table.');
  }
  if (Object.hasOwn(presentation, 'chart_type')
      && (typeof presentation.chart_type !== 'string'
        || !['line', 'combo', 'bar', 'stacked', 'cumulative', 'pie'].includes(presentation.chart_type))) {
    throw new Error('--presentation.chart_type must be line, combo, bar, stacked, cumulative, or pie.');
  }
  if (Object.hasOwn(presentation, 'table_layout')
      && (typeof presentation.table_layout !== 'string'
        || !['date', 'event', 'group'].includes(presentation.table_layout))) {
    throw new Error('--presentation.table_layout must be date, event, or group.');
  }
  if (ctx.str('model-type') !== '' && ctx.str('model-type') !== 'event'
      && (!allowDisplay || keys.some((key) => legacyFields.includes(key)))) {
    throw new Error('--presentation is supported only for event reports.');
  }
  if (Object.hasOwn(presentation, 'series')) validateSeries(presentation.series);
  if (allowDisplay) validateDisplayPresentation(presentation, ctx.str('model-type'));
}

function validateSeries(value: unknown): void {
  if (!Array.isArray(value)) throw new Error('--presentation.series must be an array; [] resets all series.');
  const indexes = new Set<number>();
  for (const [position, item] of value.entries()) {
    const path = `--presentation.series[${position}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)
        || Object.keys(item).length !== 3
        || Object.keys(item).some((key) => !['metric_index', 'type', 'axis'].includes(key))) {
      throw new Error(`${path} requires only metric_index, type, and axis, all three required.`);
    }
    const series = item as Record<string, unknown>;
    if (typeof series.metric_index !== 'number' || !Number.isInteger(series.metric_index) || series.metric_index < 1) {
      throw new Error(`${path}.metric_index must be a positive 1-based integer position in definition.metrics.`);
    }
    if (indexes.has(series.metric_index)) throw new Error(`${path}.metric_index must not repeat another series binding.`);
    indexes.add(series.metric_index);
    if (typeof series.type !== 'string' || !['bar', 'line'].includes(series.type)) {
      throw new Error(`${path}.type must be bar or line.`);
    }
    if (typeof series.axis !== 'string' || !['primary', 'secondary'].includes(series.axis)) {
      throw new Error(`${path}.axis must be primary or secondary.`);
    }
  }
}
