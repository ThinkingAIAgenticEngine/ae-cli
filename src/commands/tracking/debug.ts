import { Command } from 'commander';
import { request } from 'undici';
import { createTrackingClient } from '../../core/tracking-client.js';
import { t } from '../../tracking/i18n/translate.js';
import { HOST_OPTION_DESC, resolveTrackingHost } from './shared.js';

function formatTeTime(d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function parseProps(prop: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const kv of prop) {
    const ix = kv.indexOf('=');
    if (ix > 0) out[kv.slice(0, ix)] = kv.slice(ix + 1);
  }
  return out;
}

function nowMinusOneHour(): string {
  const d = new Date(Date.now() - 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function registerDebug(cmd: Command, rootProgram: Command): void {
  cmd.description('AE Debug-mode utilities (devices, test events, watch)');

  const device = cmd.command('device').description('manage AE Debug devices');

  device.command('list')
    .description('List registered AE Debug devices for a project')
    .requiredOption('-p, --project <id>', 'AE projectId', (v) => parseInt(v, 10))
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (opts: { project: number; host?: string }) => {
      const host = resolveTrackingHost(rootProgram, opts);
      const client = await createTrackingClient(host);
      const list = await client.listDevice(opts.project);
      if (list.length === 0) { console.log(t('debug.no_devices')); return; }
      console.log(t('debug.device_header'));
      for (const d of list) console.log(`${d.deviceId}\t${d.deviceName}\t${d.lastClearTime ?? ''}`);
    });

  device.command('add')
    .description('Register a new AE Debug device')
    .requiredOption('-p, --project <id>', 'AE projectId', (v) => parseInt(v, 10))
    .requiredOption('--device-id <id>', 'device identifier (becomes #device_id when sending events)')
    .requiredOption('--device-name <name>', 'human-readable label')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (opts: { project: number; deviceId: string; deviceName: string; host?: string }) => {
      const host = resolveTrackingHost(rootProgram, opts);
      const client = await createTrackingClient(host);
      await client.addDevice(opts.project, opts.deviceId, opts.deviceName);
      console.log(t('debug.device_added', { deviceId: opts.deviceId }));
    });

  device.command('select')
    .description('Set the active AE Debug device for a project')
    .requiredOption('-p, --project <id>', 'AE projectId', (v) => parseInt(v, 10))
    .requiredOption('--device-id <id>')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (opts: { project: number; deviceId: string; host?: string }) => {
      const host = resolveTrackingHost(rootProgram, opts);
      const client = await createTrackingClient(host);
      await client.selectDevice(opts.project, opts.deviceId);
      console.log(t('debug.device_selected', { deviceId: opts.deviceId }));
    });

  device.command('remove')
    .description('Remove an AE Debug device from a project')
    .requiredOption('-p, --project <id>', 'AE projectId', (v) => parseInt(v, 10))
    .requiredOption('--device-id <id>')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (opts: { project: number; deviceId: string; host?: string }) => {
      const host = resolveTrackingHost(rootProgram, opts);
      const client = await createTrackingClient(host);
      await client.removeDevice(opts.project, opts.deviceId);
      console.log(t('debug.device_removed', { deviceId: opts.deviceId }));
    });

  cmd.command('send')
    .description('validate connectivity: POST a test event via REST API (does NOT appear in Debug UI)')
    .requiredOption('--receiver <url>', 'AE data receiver URL')
    .requiredOption('--appid <id>', 'AE appId')
    .requiredOption('--event <name>', 'event name')
    .option('--distinct-id <id>', '#distinct_id', 'claude-test')
    .option('--prop <kv...>', 'k=v pairs (repeatable)', [] as string[])
    .action(async (opts: {
      receiver: string; appid: string; event: string; distinctId: string; prop: string[];
    }) => {
      const body = {
        appid: opts.appid,
        debug: 1,
        data: {
          '#type': 'track',
          '#event_name': opts.event,
          '#time': formatTeTime(new Date()),
          '#distinct_id': opts.distinctId,
          properties: parseProps(opts.prop),
        },
      };
      const url = opts.receiver.replace(/\/$/, '') + '/sync_json';
      const { statusCode, body: resBody } = await request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await resBody.text();
      console.log(`HTTP ${statusCode}`);
      console.log(text);
      if (statusCode === 200) {
        try {
          const r = JSON.parse(text);
          if (r.code === 0) console.log('\n' + t('debug.validation_passed'));
          else console.log('\n' + t('debug.validation_failed', { message: r.msg ?? 'unknown error' }));
        } catch { /* ignore */ }
      }
    });

  cmd.command('watch')
    .description('Pull one-shot snapshot of SDK debug events from a device (requires SDK mode:debug)')
    .requiredOption('-p, --project <id>', 'AE projectId', (v) => parseInt(v, 10))
    .requiredOption('--device-id <id>')
    .option('--host <url>', HOST_OPTION_DESC)
    .option('--since <time>', 'start time YYYY-MM-DD HH:MM:SS', nowMinusOneHour())
    .action(async (opts: { project: number; deviceId: string; host?: string; since: string }) => {
      const host = resolveTrackingHost(rootProgram, opts);
      const client = await createTrackingClient(host);
      const data = await client.listDeviceData(opts.project, opts.deviceId, opts.since);
      console.log(JSON.stringify(data, null, 2));
    });
}
