import type { Command } from '../../../framework/types.js';
import {
  defineSystemCommand,
  fieldsField,
  limitField,
  offsetField,
  validation,
} from './shared.js';

const dateFields = [
  { flag: 'start-time', type: 'string', required: true, desc: 'Inclusive ISO date/time lower bound.' },
  { flag: 'end-time', type: 'string', required: true, desc: 'Inclusive ISO date/time upper bound.' },
] as const;

export const systemUsageCommands: Command[] = [
  defineSystemCommand({
    resource: 'usage',
    command: 'overview',
    capabilityId: 'system.usage.overview',
    description: 'Get the current company system-usage summary.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'project-usage',
    command: 'list',
    capabilityId: 'system.project_usage.list',
    description: 'List project storage and usage statistics in a bounded time range.',
    risk: 'read',
    fields: [
      ...dateFields,
      fieldsField,
      limitField,
      offsetField,
      { flag: 'sort-by', type: 'string', desc: 'Sort field.', allowed: ['data_num', 'project_id', 'project_name', 'status'] },
      { flag: 'sort-order', type: 'string', desc: 'Sort direction.', allowed: ['asc', 'desc'] },
    ],
  }),
  defineSystemCommand({
    resource: 'usage-trend',
    command: 'query',
    capabilityId: 'system.usage_trend.query',
    description: 'Query a bounded company or project usage trend.',
    risk: 'read',
    fields: [
      ...dateFields,
      { flag: 'metric', type: 'string', required: true, desc: 'Supported usage metric; apollo_token is not available.' },
      { flag: 'time-granularity', type: 'string', required: true, desc: 'Aggregation granularity.', allowed: ['day', 'week', 'month'] },
      { flag: 'scope', type: 'string', desc: 'Aggregation scope.', allowed: ['company', 'project'] },
      { flag: 'project-ids', type: 'json', array: true, desc: 'Project ID JSON array; required for project scope.' },
      { flag: 'data-type', type: 'string', desc: 'Optional event-volume data type.', allowed: ['all', 'event', 'user'] },
    ],
    validate: (_ctx, input) => {
      if (input.metric === 'apollo_token') {
        throw validation('--metric apollo_token is not implemented by the current service.');
      }
      if (input.scope === 'project' && (!Array.isArray(input.project_ids) || input.project_ids.length === 0)) {
        throw validation('--project-ids is required when --scope project.');
      }
    },
  }),
  defineSystemCommand({
    resource: 'usage-trend',
    command: 'export',
    capabilityId: 'system.usage_trend.export',
    asyncArtifact: true,
    description: 'Export a bounded usage trend as a cancellable run-scoped gzip JSONL artifact.',
    risk: 'read',
    fields: [
      ...dateFields,
      { flag: 'metric', type: 'string', required: true, desc: 'Supported usage metric; apollo_token is not available.' },
      { flag: 'time-granularity', type: 'string', required: true, desc: 'Aggregation granularity.', allowed: ['day', 'week', 'month'] },
      { flag: 'scope', type: 'string', desc: 'Aggregation scope.', allowed: ['company', 'project'] },
      { flag: 'project-ids', type: 'json', array: true, desc: 'Project ID JSON array; required for project scope.' },
      { flag: 'data-type', type: 'string', desc: 'Optional event-volume data type.', allowed: ['all', 'event', 'user'] },
      {
        flag: 'request-id',
        type: 'string',
        pattern: '^cli_[0-9a-f]{32}$',
        desc: 'Optional caller-supplied cli_<32 lowercase hex> lifecycle ID; ae-cli generates one before dispatch when omitted.',
      },
      {
        flag: 'timeout-seconds',
        type: 'number',
        min: 1,
        max: 21600,
        desc: 'Maximum export runtime in seconds. Default and max: 21600.',
      },
    ],
    validate: (_ctx, input) => {
      if (input.metric === 'apollo_token') {
        throw validation('--metric apollo_token is not implemented by the current service.');
      }
      if (input.scope === 'project' && (!Array.isArray(input.project_ids) || input.project_ids.length === 0)) {
        throw validation('--project-ids is required when --scope project.');
      }
    },
  }),
];
