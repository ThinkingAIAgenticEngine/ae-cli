import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  optionalJson,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import { optionalMetricMode } from './shared.js';

export const metadataMetricUpdate = createAnalysisMetaCapabilityCommand({
  resource: 'metric',
  command: 'update',
  capabilityId: 'metadata.metric.update',
  description: 'Update metric definition, name, and remark.',
  flags: [
    projectIdFlag,
    { name: 'metric-id', type: 'number', required: true, desc: 'Metric ID.' },
    { name: 'metric-name', type: 'string', required: false, desc: 'Metric technical name for full-definition update.' },
    { name: 'metric-desc', type: 'string', required: false, desc: 'Metric display name.' },
    { name: 'metric-remark', type: 'string', required: false, desc: 'Metric remark.' },
    { name: 'metric-mode', type: 'number', required: false, desc: 'Metric model mode for full-definition update.' },
    { name: 'model-type', type: 'string', required: false, desc: 'Semantic metric model type: event or retention. Prefer this over metric-mode.' },
    { name: 'metric-events', type: 'json', required: false, desc: 'Metric event-analysis QP JSON array for full-definition update.' },
    { name: 'metric-params', type: 'json', required: false, desc: 'Metric params JSON object.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    metric_id: ctx.num('metric-id'),
    metric_name: optionalString(ctx, 'metric-name'),
    metric_desc: optionalString(ctx, 'metric-desc'),
    metric_remark: optionalString(ctx, 'metric-remark'),
    metric_mode: optionalMetricMode(ctx),
    metric_events: optionalJson(ctx, 'metric-events'),
    metric_params: optionalJson(ctx, 'metric-params'),
  }),
});
