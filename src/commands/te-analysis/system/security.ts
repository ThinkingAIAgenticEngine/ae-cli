import type { Command } from '../../../framework/types.js';
import { encryptTaPassword } from '../../../core/ta-password-encryption.js';
import { defineSystemCommand } from './shared.js';

export const systemSecurityCommands: Command[] = [
  defineSystemCommand({
    resource: 'mfa',
    command: 'get',
    capabilityId: 'system.mfa.get',
    description: 'Get the company MFA enforcement state.',
    risk: 'read',
  }),
  defineSystemCommand({
    resource: 'mfa',
    command: 'update',
    capabilityId: 'system.mfa.update',
    description: 'Enable or disable company MFA enforcement.',
    risk: 'high-risk-write',
    fields: [
      { flag: 'enabled', type: 'boolean', required: true, desc: 'Target MFA enforcement state.' },
    ],
  }),
  defineSystemCommand({
    resource: 'member-mfa',
    command: 'unbind',
    capabilityId: 'system.member_mfa.unbind',
    description: 'Unbind one member MFA enrollment.',
    risk: 'high-risk-write',
    fields: [
      { flag: 'login-name', type: 'string', required: true, desc: 'Target member login name.' },
    ],
  }),
  defineSystemCommand({
    resource: 'member-password',
    command: 'reset',
    capabilityId: 'system.member_password.reset',
    description: 'Reset one member password after local TA-compatible RSA encryption.',
    risk: 'high-risk-write',
    fields: [
      { flag: 'target-user-id', type: 'number', required: true, min: 1, desc: 'Target member user ID.' },
    ],
    secrets: [
      {
        input: 'encrypted_password',
        flag: 'password',
        required: true,
        desc: 'New member password.',
        transform: encryptTaPassword,
      },
    ],
  }),
];
