import type { RuntimeContext } from '../../../framework/types.js';
import { createAiMonitorCapabilityCommand, prepareAiMonitorScope, scopeValue } from '../shared.js';

export function buildTraceGetInput(ctx: RuntimeContext) {
  return {
    trace_id: ctx.str('trace-id'),
    data_token: scopeValue(ctx, 'platform', 'data-token', 'AE-AGENT'),
    report_source: scopeValue(ctx, 'environment', 'report-source', '__default__'),
  };
}

export const traceGet = createAiMonitorCapabilityCommand({
  resource: 'trace',
  command: 'get',
  capabilityId: 'ai_monitor.trace.get',
  description: 'Get one trace snapshot and its spans from your company.',
  flags: [
    { name: 'trace-id', type: 'string', required: true, desc: 'Trace identifier.', minLength: 1, maxLength: 512, pattern: '^\\S+$' },
    { name: 'platform', type: 'string', desc: 'Agent platform name or id. Discover values with `platform list`.', minLength: 1, maxLength: 255 },
    { name: 'environment', type: 'string', desc: 'Runtime environment name or id. Discover values with `platform list`.', minLength: 1, maxLength: 255 },
    { name: 'data-token', type: 'string', desc: 'Advanced compatibility flag for the Agent platform key. Default: AE-AGENT.', minLength: 1, maxLength: 255 },
    { name: 'report-source', type: 'string', desc: 'Advanced compatibility flag for the runtime environment key. Default: __default__.', minLength: 1, maxLength: 255 },
  ],
  risk: 'read',
  buildInput: buildTraceGetInput,
  prepareInput: prepareAiMonitorScope,
});
