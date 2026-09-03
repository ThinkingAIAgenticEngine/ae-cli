import type { Command } from '../../framework/types.js';
import { createCliChannelCommand, encodeId } from './shared.js';

function whatsappWebPath(channelId: string): string {
  return `/api/cli/channel/v1/channels/${encodeId(channelId)}/whatsapp-web`;
}

export const getWhatsAppWebStatus = createCliChannelCommand({
  resource: 'channel whatsapp-web',
  command: 'status',
  description: 'Get the WhatsApp Web link status for one channel',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'WhatsApp channel ID' },
  ],
  risk: 'read',
  prepare: (ctx) => ({ method: 'GET', path: whatsappWebPath(ctx.str('id')) }),
});

export const startWhatsAppWebLink = createCliChannelCommand({
  resource: 'channel whatsapp-web',
  command: 'start',
  description: 'Start or resume WhatsApp Web QR linking',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'WhatsApp channel ID' },
  ],
  risk: 'write',
  prepare: (ctx) => ({ method: 'POST', path: whatsappWebPath(ctx.str('id')) }),
});

export const unlinkWhatsAppWeb = createCliChannelCommand({
  resource: 'channel whatsapp-web',
  command: 'unlink',
  description: 'Unlink WhatsApp Web and remove its stored credentials',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'WhatsApp channel ID' },
  ],
  risk: 'high-risk-write',
  prepare: (ctx) => ({ method: 'DELETE', path: whatsappWebPath(ctx.str('id')) }),
});

export const channelWhatsAppCommands: Command[] = [
  getWhatsAppWebStatus,
  startWhatsAppWebLink,
  unlinkWhatsAppWeb,
];
