import type { Command } from '../../../framework/types.js';
import { BASE_RUN_PATH } from '../shared.js';
import { printOutput, printError } from '../../../framework/output.js';

const STREAM_PATH = (id: string) => `${BASE_RUN_PATH}/stream/${id}`;

const SUCCESS_STATUSES = new Set(['completed', 'partial_success']);
const MAX_RECONNECTS = 10;
const RECONNECT_DELAY_MS = 2000;

export const watchRun: Command = {
  service: 'team',
  command: '+run-watch',
  description: 'Stream a TeamRun via SSE. Exits 0 on success, 1 on failure, 2 on waiting_user.',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'TeamRun ID' },
    { name: 'after-log', type: 'number', required: false, desc: 'Reconnect: replay only logs after this timestamp' },
    { name: 'quiet', type: 'boolean', required: false, desc: 'Suppress log/status lines on stderr' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'GET',
    url: `${ctx.host().replace(/\/$/, '')}${STREAM_PATH(ctx.str('id'))}`,
  }),
  execute: async (ctx) => {
    const runId = ctx.str('id');
    const quiet = ctx.bool('quiet');
    const token = await ctx.token();
    const host = ctx.host().replace(/\/$/, '');

    // Tracks the last log timestamp across reconnects to avoid replaying old log lines.
    let lastLogTs: number | undefined = ctx.num('after-log') || undefined;
    let reconnects = 0;

    while (reconnects <= MAX_RECONNECTS) {
      const url = new URL(`${host}${STREAM_PATH(runId)}`);
      if (lastLogTs !== undefined) url.searchParams.set('afterLog', String(lastLogTs));

      let resp: Response;
      try {
        resp = await fetch(url.toString(), {
          headers: {
            Authorization: `bearer ${token}`,
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (err: any) {
        if (!quiet) process.stderr.write(`[reconnect] network error: ${err.message}\n`);
        reconnects++;
        await delay(RECONNECT_DELAY_MS);
        continue;
      }

      if (!resp.ok || !resp.body) {
        printError('api', `Stream connection failed: ${resp.status} ${resp.statusText}`);
        process.exit(1);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let evtName = '';
      let evtData = '';

      const flush = () => {
        if (!evtName || !evtData) {
          evtName = evtData = '';
          return;
        }

        let payload: any;
        try {
          payload = JSON.parse(evtData);
        } catch {
          process.stderr.write(`[warn] unparseable SSE data for event "${evtName}"\n`);
          evtName = evtData = '';
          return;
        }

        switch (evtName) {
          case 'log': {
            if (payload.timestamp) lastLogTs = payload.timestamp;
            if (!quiet) {
              const { type, stepId, content } = payload;
              process.stderr.write(`[${type}] ${stepId}: ${content}\n`);
            }
            break;
          }
          case 'error': {
            printError('api', payload.error || 'stream error');
            process.exit(1);
            break;
          }
          case 'snapshot':
          case 'update': {
            const { status } = payload;
            if (!quiet) process.stderr.write(`[status] ${status}\n`);
            if (status === 'waiting_user') {
              printOutput(payload, 'json');
              process.exit(2);
            }
            break;
          }
          case 'final': {
            printOutput(payload, 'json');
            process.exit(SUCCESS_STATUSES.has(payload.status) ? 0 : 1);
            break;
          }
        }

        evtName = evtData = '';
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) { streamDone = true; break; }

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            evtName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            evtData = line.slice(5).trim();
          } else if (line === '') {
            flush();
          }
        }
      }

      // Stream closed without a final/error event — reconnect.
      reconnects++;
      if (!quiet) process.stderr.write(`[reconnect] stream closed (${reconnects}/${MAX_RECONNECTS}), retrying...\n`);
      await delay(RECONNECT_DELAY_MS);
    }

    printError('api', `Stream closed after ${MAX_RECONNECTS} reconnect attempts`);
    process.exit(1);
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
