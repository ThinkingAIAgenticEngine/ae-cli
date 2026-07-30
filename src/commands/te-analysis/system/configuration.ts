import type { Command } from '../../../framework/types.js';
import {
  defineSystemCommand,
  requireAtLeastOne,
  validation,
} from './shared.js';

const addressUrl = { flag: 'address-url', type: 'string', required: true, desc: 'Receiver address URL.' } as const;
const addressType = {
  flag: 'address-type',
  type: 'string',
  required: true,
  desc: 'Receiver address type.',
  allowed: ['public', 'private'],
} as const;
const loginType = {
  flag: 'login-type',
  type: 'string',
  required: true,
  desc: 'Third-party login type.',
  allowed: ['wecom', 'dingtalk', 'feishu'],
} as const;

export const systemConfigurationCommands: Command[] = [
  defineSystemCommand({
    resource: 'preference',
    command: 'get',
    capabilityId: 'system.preference.get',
    description: 'Get typed company preferences exposed to CLI.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'preference',
    command: 'update',
    capabilityId: 'system.preference.update',
    description: 'Update typed company navigation preference.',
    risk: 'write',
    fields: [
      { flag: 'navigation-permission-hide', type: 'boolean', required: true, desc: 'Hide navigation entries without permission.' },
    ],
  }),
  defineSystemCommand({
    resource: 'smtp',
    command: 'get',
    capabilityId: 'system.smtp.get',
    description: 'Get sanitized company SMTP configuration.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'smtp',
    command: 'upsert',
    capabilityId: 'system.smtp.upsert',
    description: 'Create or update company SMTP configuration using a protected password source.',
    risk: 'write',
    fields: [
      { flag: 'server-host', type: 'string', required: true, desc: 'SMTP server host.' },
      { flag: 'server-port', type: 'number', required: true, min: 1, max: 65535, desc: 'SMTP server port.' },
      { flag: 'has-encrypt', type: 'number', allowed: [0, 1, 2], desc: 'Encryption mode: 0, 1, or 2.' },
      { flag: 'sender-address', type: 'string', required: true, desc: 'Sender email address.' },
      { flag: 'sender-name', type: 'string', required: true, desc: 'Sender display name.' },
      { flag: 'subject-prefix', type: 'string', desc: 'Optional subject prefix.' },
    ],
    secrets: [
      { input: 'password', flag: 'password', required: true, desc: 'SMTP password.' },
    ],
  }),
  defineSystemCommand({
    resource: 'smtp',
    command: 'test',
    capabilityId: 'system.smtp.test',
    description: 'Send one SMTP test using the saved configuration.',
    risk: 'write',
    fields: [
      { flag: 'receiver', type: 'string', required: true, desc: 'Test email receiver.' },
    ],
  }),
  defineSystemCommand({
    resource: 'smtp',
    command: 'delete',
    capabilityId: 'system.smtp.delete',
    description: 'Delete company SMTP configuration.',
    risk: 'high-risk-write',
  }),
  defineSystemCommand({
    resource: 'receiver-address',
    command: 'overview',
    capabilityId: 'system.receiver_address.overview',
    description: 'Get company receiver-address overview.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'receiver-address',
    command: 'project-list',
    capabilityId: 'system.receiver_address.project_list',
    description: 'List project receiver-address overrides.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'receiver-address',
    command: 'upsert',
    capabilityId: 'system.receiver_address.upsert',
    description: 'Create or update a typed receiver address.',
    risk: 'write',
    fields: [
      { flag: 'scope', type: 'string', required: true, desc: 'Receiver scope.', allowed: ['global', 'project'] },
      addressUrl,
      addressType,
      { flag: 'project-ids', type: 'json', array: true, desc: 'Project ID JSON array; required for project scope.' },
      { flag: 'original-address-url', type: 'string', desc: 'Original URL when changing an existing address.' },
      { flag: 'original-address-type', type: 'string', desc: 'Original address type.', allowed: ['public', 'private'] },
    ],
    validate: (_ctx, input) => {
      if (input.scope === 'project' && (!Array.isArray(input.project_ids) || input.project_ids.length === 0)) {
        throw validation('--project-ids is required when --scope project.');
      }
    },
  }),
  defineSystemCommand({
    resource: 'receiver-address',
    command: 'promote',
    capabilityId: 'system.receiver_address.promote',
    description: 'Promote a receiver address to company scope.',
    risk: 'write',
    fields: [
      addressUrl,
      addressType,
      { flag: 'remove-project-custom', type: 'boolean', desc: 'Remove matching project overrides after promotion.' },
    ],
  }),
  defineSystemCommand({
    resource: 'receiver-address',
    command: 'delete',
    capabilityId: 'system.receiver_address.delete',
    description: 'Delete a receiver address.',
    risk: 'high-risk-write',
    fields: [addressUrl, addressType],
  }),
  defineSystemCommand({
    resource: 'receiver-detection',
    command: 'get',
    capabilityId: 'system.receiver_detection.get',
    description: 'Get receiver-address detection configuration.',
    risk: 'read',
    fields: [addressUrl],
  }),
  defineSystemCommand({
    resource: 'receiver-detection',
    command: 'update',
    capabilityId: 'system.receiver_detection.update',
    description: 'Update typed receiver-address detection configuration.',
    risk: 'write',
    fields: [
      addressUrl,
      { flag: 'execute-type', type: 'string', required: true, desc: 'Detection execution scope.', allowed: ['ta_cluster', 'all'] },
      { flag: 'schedule-type', type: 'string', required: true, desc: 'Detection schedule.', allowed: ['minutes', 'hour', 'day', 'disabled'] },
      { flag: 'allow-notification', type: 'boolean', required: true, desc: 'Allow detection notifications.' },
    ],
  }),
  defineSystemCommand({
    resource: 'receiver-detection',
    command: 'run',
    capabilityId: 'system.receiver_detection.run',
    description: 'Run receiver-address detection now.',
    risk: 'write',
    fields: [addressUrl],
  }),
  defineSystemCommand({
    resource: 'third-party-login',
    command: 'list',
    capabilityId: 'system.third_party_login.list',
    description: 'List sanitized third-party login configurations.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'third-party-login',
    command: 'upsert',
    capabilityId: 'system.third_party_login.upsert',
    description: 'Create or update a third-party login configuration using protected secret sources.',
    risk: 'write',
    fields: [
      loginType,
      { flag: 'app-id', type: 'string', required: true, desc: 'Provider application ID.' },
      { flag: 'corp-id', type: 'string', desc: 'Provider corporation ID.' },
      { flag: 'agent-id', type: 'string', desc: 'Provider agent ID.' },
      { flag: 'dd-scan-app-id', type: 'string', desc: 'DingTalk scan-login application ID.' },
    ],
    secrets: [
      { input: 'app_secret', flag: 'app-secret', required: true, desc: 'Provider application secret.' },
      { input: 'dd_scan_app_secret', flag: 'dd-scan-app-secret', desc: 'DingTalk scan-login application secret.' },
    ],
    validate: (_ctx, input) => {
      if (input.login_type === 'wecom' && !input.corp_id) {
        throw validation('--corp-id is required for wecom.');
      }
      if (input.login_type === 'dingtalk') {
        requireAtLeastOne(input, ['corp_id'], '--corp-id is required for dingtalk.');
        for (const name of ['agent_id', 'dd_scan_app_id', 'dd_scan_app_secret']) {
          if (!input[name]) throw validation(`--${name.replaceAll('_', '-')} is required for dingtalk.`);
        }
      }
    },
  }),
  defineSystemCommand({
    resource: 'third-party-login',
    command: 'disable',
    capabilityId: 'system.third_party_login.disable',
    description: 'Disable a third-party login provider.',
    risk: 'high-risk-write',
    fields: [loginType],
  }),
  defineSystemCommand({
    resource: 'oauth2',
    command: 'update',
    capabilityId: 'system.oauth2.update',
    description: 'Enable or disable company OAuth2 login.',
    risk: 'write',
    fields: [
      { flag: 'enable-oauth2', type: 'boolean', required: true, desc: 'Target OAuth2 login state.' },
    ],
  }),
];
