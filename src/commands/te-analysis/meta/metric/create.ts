import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalJson,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import { metricMode } from './shared.js';

export const metadataMetricCreate = createAnalysisMetaCapabilityCommand({
  resource: 'metric',
  command: 'create',
  capabilityId: 'metadata.metric.create',
  description: 'Create a metric from event or retention analysis configuration.',
  flags: [
    projectIdFlag,
    { name: 'metric-name', type: 'string', required: true, desc: 'Metric technical name, for example pay_count.' },
    { name: 'metric-desc', type: 'string', required: true, desc: 'Metric display name.' },
    { name: 'metric-remark', type: 'string', required: false, desc: 'Metric remark.' },
    { name: 'metric-mode', type: 'number', required: false, desc: 'Metric model mode, for example 0 for event analysis.' },
    { name: 'model-type', type: 'string', required: false, desc: 'Semantic metric model type: event or retention. Prefer this over metric-mode.' },
    { name: 'metric-events', type: 'json', required: true, desc: 'Metric event-analysis QP JSON array.' },
    { name: 'metric-params', type: 'json', required: false, desc: 'Metric params JSON object. Defaults to {} in common when omitted.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    metric_name: ctx.str('metric-name'),
    metric_desc: ctx.str('metric-desc'),
    metric_remark: optionalString(ctx, 'metric-remark'),
    metric_mode: metricMode(ctx),
    metric_events: ctx.json('metric-events'),
    metric_params: optionalJson(ctx, 'metric-params'),
  }),
});
