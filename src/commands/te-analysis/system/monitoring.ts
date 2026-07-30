import type { Command } from '../../../framework/types.js';
import {
  defineSystemCommand,
  fieldsField,
  offsetField,
  requireArrayObjects,
  requireAtLeastOne,
  validation,
} from './shared.js';

const monitorScopeFields = [
  { flag: 'project-ids', type: 'json', array: true, desc: 'Project ID JSON array.' },
  { flag: 'space-codes', type: 'json', array: true, desc: 'Project space-code JSON array.' },
] as const;

const monitorTimeFields = [
  {
    flag: 'start-time',
    type: 'string',
    required: true,
    pattern: '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$',
    desc: 'Inclusive query range start, yyyy-MM-dd HH:mm:ss.',
  },
  {
    flag: 'end-time',
    type: 'string',
    required: true,
    pattern: '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$',
    desc: 'Inclusive query range end, yyyy-MM-dd HH:mm:ss.',
  },
] as const;

function validateTaskQueryInput(input: Record<string, unknown>): void {
  validateMonitorScope(input);
  for (const name of ['status_codes', 'content_codes', 'task_type_codes']) {
    requireAtLeastOne(input, [name], `--${name.replaceAll('_', '-')} must be a non-empty JSON array.`);
  }
}

function validateMonitorScope(input: Record<string, unknown>): void {
  requireAtLeastOne(
    input,
    ['project_ids', 'space_codes'],
    'Provide a non-empty --project-ids or --space-codes array.',
  );
}

const contactWebhookSecrets = [
  { input: 'dingding_webhook', flag: 'dingding-webhook', desc: 'DingTalk webhook.' },
  { input: 'wechat_webhook', flag: 'wechat-webhook', desc: 'WeCom webhook.' },
  { input: 'feishu_webhook', flag: 'feishu-webhook', desc: 'Feishu webhook.' },
  { input: 'slack_webhook', flag: 'slack-webhook', desc: 'Slack webhook.' },
  { input: 'kim_webhook', flag: 'kim-webhook', desc: 'KIM webhook.' },
] as const;

export const systemMonitoringCommands: Command[] = [
  defineSystemCommand({
    resource: 'query-monitor',
    command: 'overview',
    capabilityId: 'system.query_monitor.overview',
    description: 'Get bounded query queue and resource-monitor charts.',
    risk: 'read',
    fields: [
      { flag: 'duration-minutes', type: 'number', min: 1, max: 1440, desc: 'Monitoring duration in minutes. Default: 60.' },
      ...monitorScopeFields,
      { flag: 'cluster-names', type: 'json', required: true, array: true, desc: 'Query cluster-name JSON array.' },
      { flag: 'point-interval-seconds', type: 'number', min: 5, max: 300, desc: 'Chart sample interval seconds. Default: 5.' },
    ],
    validate: (_ctx, input) => validateMonitorScope(input),
  }),
  defineSystemCommand({
    resource: 'query-task',
    command: 'options',
    capabilityId: 'system.query_task.options',
    description: 'List valid query-task filter codes and cluster names before list or export.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'query-task',
    command: 'list',
    capabilityId: 'system.query_task.list',
    description: 'List query-monitor tasks; run query-task options first to discover filter codes.',
    risk: 'read',
    fields: [
      ...monitorTimeFields,
      ...monitorScopeFields,
      { flag: 'status-codes', type: 'json', required: true, array: true, desc: 'Task status-code JSON array.' },
      { flag: 'content-codes', type: 'json', required: true, array: true, desc: 'Query content-code JSON array.' },
      { flag: 'task-type-codes', type: 'json', required: true, array: true, desc: 'Query task-type-code JSON array.' },
      { flag: 'cluster-names', type: 'json', array: true, desc: 'Optional cluster-name JSON array.' },
      { flag: 'limit', type: 'number', min: 1, max: 1000, desc: 'Maximum returned tasks. Default: 100, max: 1000.' },
      offsetField,
      fieldsField,
    ],
    validate: (_ctx, input) => validateTaskQueryInput(input),
  }),
  defineSystemCommand({
    resource: 'query-task',
    command: 'get',
    capabilityId: 'system.query_task.get',
    description: 'Get a sanitized query-monitor task detail.',
    risk: 'read',
    fields: [
      { flag: 'task-id', type: 'string', required: true, desc: 'Query-monitor task ID.' },
      { flag: 'sql-max-chars', type: 'number', min: 0, max: 100000, desc: 'Maximum returned SQL characters.' },
    ],
  }),
  defineSystemCommand({
    resource: 'query-task',
    command: 'cancel',
    capabilityId: 'system.query_task.cancel',
    description: 'Cancel one running query-monitor task by task_id.',
    risk: 'high-risk-write',
    fields: [
      { flag: 'task-id', type: 'string', required: true, desc: 'Query-monitor task ID, not a CLI run_id.' },
    ],
  }),
  defineSystemCommand({
    resource: 'query-task',
    command: 'export',
    capabilityId: 'system.query_task.export',
    description: 'Export query tasks; run query-task options first to discover filter codes.',
    risk: 'read',
    fields: [
      ...monitorTimeFields,
      ...monitorScopeFields,
      { flag: 'status-codes', type: 'json', required: true, array: true, desc: 'Task status-code JSON array.' },
      { flag: 'content-codes', type: 'json', required: true, array: true, desc: 'Query content-code JSON array.' },
      { flag: 'task-type-codes', type: 'json', required: true, array: true, desc: 'Query task-type-code JSON array.' },
      { flag: 'cluster-names', type: 'json', array: true, desc: 'Optional cluster-name JSON array.' },
      { flag: 'download-columns', type: 'json', array: true, desc: 'Optional CSV column JSON array.' },
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
    validate: (_ctx, input) => validateTaskQueryInput(input),
  }),
  defineSystemCommand({
    resource: 'node-monitor',
    command: 'list',
    capabilityId: 'system.node_monitor.list',
    description: 'List sanitized cluster node usage.',
    risk: 'read',
    fields: [
      { flag: 'limit', type: 'number', min: 1, max: 200, desc: 'Page size. Default: 50, max: 200.' },
      offsetField,
      fieldsField,
    ],
  }),
  defineSystemCommand({
    resource: 'query-alert-rule',
    command: 'list',
    capabilityId: 'system.query_alert_rule.list',
    description: 'List query-monitor alert rules and metric definitions.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'query-alert-rule',
    command: 'update',
    capabilityId: 'system.query_alert_rule.update',
    description: 'Batch upsert and delete query-monitor alert rules.',
    risk: 'high-risk-write',
    fields: [
      { flag: 'upserts', type: 'json', array: true, desc: 'Rule upsert JSON array.' },
      { flag: 'delete-ids', type: 'json', array: true, desc: 'Positive rule-ID JSON array to delete.' },
    ],
    validate: (_ctx, input) => {
      requireAtLeastOne(input, ['upserts', 'delete_ids'], 'Provide a non-empty --upserts or --delete-ids array.');
      requireArrayObjects(input, 'upserts', ['metric_content', 'wheel_minutes', 'wheel_interval', 'threshold']);
      const deleteIds = input.delete_ids as unknown[] | undefined;
      if (deleteIds?.some((id) => !Number.isInteger(id) || Number(id) <= 0)) {
        throw validation('--delete-ids must contain positive integers.');
      }
      const upserts = input.upserts as Record<string, unknown>[] | undefined;
      for (const [index, item] of (upserts ?? []).entries()) {
        const metric = Number(item.metric_content);
        const wheelMinutes = Number(item.wheel_minutes);
        const wheelInterval = Number(item.wheel_interval);
        const threshold = Number(item.threshold);
        if (![1, 2, 3].includes(metric)
          || !Number.isInteger(wheelMinutes) || wheelMinutes < 1 || wheelMinutes > 1440
          || !Number.isInteger(wheelInterval) || wheelInterval < 1 || wheelInterval > 1000
          || !Number.isFinite(threshold) || threshold < 0) {
          throw validation(`--upserts item ${index + 1} contains an invalid metric/window/threshold.`);
        }
      }
      const deleted = new Set((deleteIds ?? []).map(Number));
      if ((upserts ?? []).some((item) => item.rule_id !== undefined && deleted.has(Number(item.rule_id)))) {
        throw validation('The same rule_id cannot appear in both --upserts and --delete-ids.');
      }
    },
  }),
  defineSystemCommand({
    resource: 'ops-alert-contact',
    command: 'list',
    capabilityId: 'system.ops_alert_contact.list',
    description: 'List sanitized operations-alert contacts.',
    risk: 'read',
    fields: [
      { flag: 'limit', type: 'number', min: 1, max: 200, desc: 'Page size. Default: 50, max: 200.' },
      offsetField,
    ],
  }),
  defineSystemCommand({
    resource: 'ops-alert-contact',
    command: 'upsert',
    capabilityId: 'system.ops_alert_contact.upsert',
    description: 'Create or update an operations-alert contact without exposing webhooks on argv.',
    risk: 'write',
    fields: [
      { flag: 'contact-id', type: 'number', min: 1, desc: 'Existing contact ID; omit to create.' },
      { flag: 'name', type: 'string', desc: 'Contact name.' },
      { flag: 'mail-address', type: 'string', desc: 'Email delivery target.' },
      { flag: 'mobile', type: 'string', desc: 'Mobile delivery target.' },
      { flag: 'on-status', type: 'number', allowed: [0, 1], desc: 'Enable state: 0 or 1; required on create.' },
    ],
    secrets: contactWebhookSecrets,
    validate: (_ctx, input) => {
      if (input.contact_id === undefined) {
        if (!input.name) throw validation('--name is required when creating a contact.');
        if (input.on_status === undefined) throw validation('--on-status is required when creating a contact.');
        requireAtLeastOne(
          input,
          ['mail_address', 'mobile', ...contactWebhookSecrets.map((item) => item.input)],
          'Provide at least one delivery target when creating a contact.',
        );
      }
    },
  }),
  defineSystemCommand({
    resource: 'ops-alert-contact',
    command: 'delete',
    capabilityId: 'system.ops_alert_contact.delete',
    description: 'Delete an operations-alert contact.',
    risk: 'high-risk-write',
    fields: [
      { flag: 'contact-id', type: 'number', required: true, min: 1, desc: 'Contact ID to delete.' },
    ],
  }),
  defineSystemCommand({
    resource: 'ops-alert-contact',
    command: 'test',
    capabilityId: 'system.ops_alert_contact.test',
    description: 'Send one rate-limited external alert test to a constrained target.',
    risk: 'write',
    fields: [
      {
        flag: 'channel',
        type: 'string',
        required: true,
        desc: 'Test channel.',
        allowed: ['email', 'sms', 'dingding', 'wechat', 'feishu', 'slack'],
      },
    ],
    secrets: [
      { input: 'target', flag: 'target', required: true, desc: 'Sensitive test destination.' },
    ],
  }),
];
