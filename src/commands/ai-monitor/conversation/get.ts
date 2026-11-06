import type { RuntimeContext } from '../../../framework/types.js';
import { createAiMonitorCapabilityCommand, prepareAiMonitorScope, scopeValue } from '../shared.js';

export function buildConversationGetInput(ctx: RuntimeContext) {
  return {
    ...(ctx.has?.('include-spans') ? { include_spans: ctx.bool('include-spans') } : {}),
    ...(ctx.has?.('span-limit') ? { span_limit: ctx.num('span-limit') } : {}),
    ...(ctx.has?.('span-offset') ? { span_offset: ctx.num('span-offset') } : {}),
    conversation_id: ctx.str('conversation-id').trim(),
    data_token: scopeValue(ctx, 'platform', 'data-token', 'AE-AGENT'),
    report_source: scopeValue(ctx, 'environment', 'report-source', '__default__'),
  };
}

export const conversationGet = createAiMonitorCapabilityCommand({
  resource: 'conversation',
  command: 'get',
  capabilityId: 'ai_monitor.conversation.get',
  description: 'Get all traces in one conversation.',
  helpText: 'Pass data.items[].te_agent_conversation_id from conversation list output as --conversation-id. The detail response returns data.conversation_id. Keep the same platform/environment scope.',
  flags: [
    { name: 'include-spans', type: 'boolean', desc: 'Include bounded Trace snapshots with spans. Default: false.' },
    { name: 'span-limit', type: 'number', min: 1, max: 100, desc: 'Maximum Trace snapshots in this span page. Default: 20; max: 100.' },
    { name: 'span-offset', type: 'number', min: 0, desc: 'Zero-based Trace snapshot offset. Default: 0.' },
    { name: 'conversation-id', type: 'string', required: true, desc: 'Conversation ID.', minLength: 1, maxLength: 512, pattern: '^\\S+$' },
    { name: 'platform', type: 'string', desc: 'Agent platform name or id. Discover values with `platform list`.', minLength: 1, maxLength: 255 },
    { name: 'environment', type: 'string', desc: 'Runtime environment name or id. Discover values with `platform list`.', minLength: 1, maxLength: 255 },
    { name: 'data-token', type: 'string', desc: 'Advanced compatibility flag for the Agent platform key. Default: AE-AGENT.', minLength: 1, maxLength: 255 },
    { name: 'report-source', type: 'string', desc: 'Advanced compatibility flag for the runtime environment key. Default: __default__.', minLength: 1, maxLength: 255 },
  ],
  risk: 'read',
  buildInput: buildConversationGetInput,
  prepareInput: prepareAiMonitorScope,
});
