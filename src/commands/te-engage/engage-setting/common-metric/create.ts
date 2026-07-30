import { createEngageSettingCapabilityCommand } from '../../shared.js';
import type { Flag } from '../../../../framework/types.js';
import {
  validateMetricDefinitionFlag,
  validateMetricWindowTimeUnitFlag,
  validatePresetMetricTypeFlag,
} from './metric-qp-validation.js';

const writeFlags: Flag[] = [
  { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
  { name: 'metric-type', type: 'number', required: true, desc: 'Metric type; create requires 1 (PRESET).' },
  { name: 'metric-name', type: 'string', required: true, desc: 'Metric name (^[a-z][0-9a-z_]{0,79}$).' },
  {
    name: 'metric-definition',
    type: 'json',
    required: true,
    desc: 'Semantic event or formula metric definition.',
  },
  { name: 'metric-window-num', type: 'number', required: true, desc: 'Metric window number.' },
  {
    name: 'metric-window-time-unit',
    type: 'string',
    required: true,
    desc: 'Metric window time unit (minute/hour/day).',
  },
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
  metric_definition: ctx.json('metric-definition'),
  metric_window_num: ctx.num('metric-window-num'),
  metric_window_time_unit: ctx.str('metric-window-time-unit'),
  display_name: ctx.str('display-name'),
  note: ctx.str('note') || undefined,
  order_id: ctx.optionalNum('order-id'),
  metric_setting_id: ctx.str('metric-setting-id') || undefined,
  metric_params: ctx.str('metric-params') || undefined,
});

/** Creates a PRESET common metric from a semantic metric definition. */
export const commonMetricCreate = createEngageSettingCapabilityCommand({
  resource: 'common-metric',
  command: 'create',
  capabilityId: 'engage-setting.common-metric.create',
  description: 'Create a PRESET common metric from a semantic event/formula definition.',
  flags: writeFlags,
  risk: 'write',
  validate: (ctx) => {
    validatePresetMetricTypeFlag(ctx.num('metric-type'));
    validateMetricDefinitionFlag(ctx.json('metric-definition'));
    validateMetricWindowTimeUnitFlag(ctx.str('metric-window-time-unit'));
  },
  buildInput: buildWriteInput,
});
