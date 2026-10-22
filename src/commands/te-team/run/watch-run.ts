import type { Command } from '../../../framework/types.js';
import { BASE_RUN_PATH } from '../shared.js';
import { printOutput, printError } from '../../../framework/output.js';
import { getAuthHeaders } from '../../../core/mcp-access.js';
import { externalCliTokenRequestOptions, redactExternalCliToken } from '../../../core/external-cli-token.js';

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
    const host = ctx.host().replace(/\/$/, '');

    // Tracks the last log timestamp across reconnects to avoid replaying old log lines.
    let lastLogTs: number | undefined = ctx.num('after-log') || undefined;
    let reconnects = 0;

    const reconnect = async (reason: string): Promise<boolean> => {
      if (reconnects >= MAX_RECONNECTS) return false;
      reconnects++;
      if (!quiet) {
        process.stderr.write(redactExternalCliToken(`[reconnect] ${reason} (${reconnects}/${MAX_RECONNECTS}), retrying...\n`));
      }
      await delay(RECONNECT_DELAY_MS);
      return true;
    };

    while (true) {
      const url = new URL(`${host}${STREAM_PATH(runId)}`);
      if (lastLogTs !== undefined) url.searchParams.set('afterLog', String(lastLogTs));
      // Recheck credentials for each connection; auth/config errors must not be retried as network failures.
      const authHeaders = await getAuthHeaders(ctx);
      const requestOptions = externalCliTokenRequestOptions(url.toString());

      let resp: Response;
      try {
        resp = await fetch(url.toString(), {
          ...requestOptions,
          headers: {
            ...authHeaders,
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (err: unknown) {
        if (!await reconnect(`network error: ${err instanceof Error ? err.message : String(err)}`)) break;
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

      const flush = async (): Promise<number | undefined> => {
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
              process.stderr.write(redactExternalCliToken(`[${type}] ${stepId}: ${content}\n`));
            }
            break;
          }
          case 'error': {
            printError('api', payload.error || 'stream error');
            return 1;
          }
          case 'snapshot':
          case 'update': {
            const { status } = payload;
            if (!quiet) process.stderr.write(`[status] ${status}\n`);
            if (status === 'waiting_user') {
              await printOutput(payload, 'json');
              return 2;
            }
            break;
          }
          case 'final': {
            await printOutput(payload, 'json');
            return SUCCESS_STATUSES.has(payload.status) ? 0 : 1;
          }
        }

        evtName = evtData = '';
      };

      let exitCode: number | undefined;
      let closeReason = 'stream closed';
      try {
        readStream: while (true) {
          let chunk: ReadableStreamReadResult<Uint8Array>;
          try {
            chunk = await reader.read();
          } catch (err: unknown) {
            // Keep event decoding/dispatch outside this transport-only retry boundary.
            if (err instanceof Error && err.name === 'AbortError') throw err;
            closeReason = `stream read error: ${err instanceof Error ? err.message : String(err)}`;
            break;
          }
          if (chunk.done) break;

          buf += decoder.decode(chunk.value, { stream: true });
          const lines = buf.split(/\r?\n/);
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              evtName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              evtData = line.slice(5).trim();
            } else if (line === '') {
              exitCode = await flush();
              if (exitCode !== undefined) break readStream;
            }
          }
        }
      } finally {
        // Cancel before exit/reconnect, including terminal events received on a still-open stream.
        try { await reader.cancel(); } catch { /* An errored stream may also reject cancellation. */ }
        reader.releaseLock();
      }
      if (exitCode !== undefined) process.exit(exitCode);

      // EOF and read failures share the connection-failure retry budget and last complete log cursor.
      if (!await reconnect(closeReason)) break;
    }

    printError('api', `Stream closed after ${MAX_RECONNECTS} reconnect attempts`);
    process.exit(1);
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
