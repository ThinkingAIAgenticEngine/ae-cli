import { createEngageSettingCapabilityCommand } from '../../shared.js';
import type { Flag } from '../../../../framework/types.js';
import { validateMetricQpFlag } from './metric-qp-validation.js';

const writeFlags: Flag[] = [
  { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  { name: 'metric-type', type: 'number', required: true, desc: 'Metric type (see MetricTypeEunm).' },
  { name: 'metric-name', type: 'string', required: true, desc: 'Metric name.' },
  { name: 'metric-qp', type: 'string', required: true, desc: 'Metric qp (event/property expression).' },
  { name: 'metric-window-num', type: 'number', required: true, desc: 'Metric window number.' },
  { name: 'metric-window-time-unit', type: 'string', required: true, desc: 'Metric window time unit (MINUTE/HOUR/DAY).' },
  { name: 'display-name', type: 'string', required: true, desc: 'Display name of the metric.' },
  { name: 'note', type: 'string', required: false, desc: 'Metric note/remark.' },
  { name: 'order-id', type: 'number', required: false, desc: 'Sort order id.' },
  { name: 'metric-setting-id', type: 'string', required: false, desc: 'Metric setting id (when binding to a setting).' },
  { name: 'metric-params', type: 'string', required: false, desc: 'Metric params JSON string.' },
];

const buildWriteInput = (ctx: any) => ({
  project_id: ctx.num('project-id'),
  metric_type: ctx.num('metric-type'),
  metric_name: ctx.str('metric-name'),
  metric_qp: ctx.str('metric-qp'),
  metric_window_num: ctx.num('metric-window-num'),
  metric_window_time_unit: ctx.str('metric-window-time-unit'),
  display_name: ctx.str('display-name'),
  note: ctx.str('note') || undefined,
  order_id: ctx.optionalNum('order-id'),
  metric_setting_id: ctx.str('metric-setting-id') || undefined,
  metric_params: ctx.str('metric-params') || undefined,
});

/** Updates an existing common metric's type, expression, time window, and display metadata. */
export const commonMetricUpdate = createEngageSettingCapabilityCommand({
  resource: 'common-metric',
  command: 'update',
  capabilityId: 'engage-setting.common-metric.update',
  description: "Update an existing common metric's type, expression, time window, and display metadata.",
  flags: writeFlags,
  risk: 'write',
  validate: (ctx) => {
    validateMetricQpFlag(ctx.str('metric-qp'));
  },
  buildInput: buildWriteInput,
});
