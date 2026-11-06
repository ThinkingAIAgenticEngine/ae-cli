import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { metadataEventUpdate } from '../src/commands/te-analysis/meta/event/update.ts';
import { metadataPropertyUpdate } from '../src/commands/te-analysis/meta/property/update.ts';
import { metadataMetricUpdate } from '../src/commands/te-analysis/meta/metric/update.ts';
import { createRuntimeContext } from '../src/framework/runner.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';

const host = 'https://contract-remark.example.invalid';
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  clearCliToken(host);
});

for (const { command, flag, field, required } of [
  { command: metadataEventUpdate, flag: 'remark', field: 'remark', required: { eventName: 'login' } },
  { command: metadataPropertyUpdate, flag: 'propRemark', field: 'prop_remark', required: { tableType: 'event', propName: 'amount' } },
  { command: metadataMetricUpdate, flag: 'metricRemark', field: 'metric_remark', required: { metricId: 1 } },
]) {
  for (const value of [undefined, '', 'new remark']) {
    test(`${command.capabilityId} preserves ${value === undefined ? 'omission' : JSON.stringify(value)}`, async () => {
      setCliTokenManual('synthetic-test-token', host);
      let input: Record<string, unknown> = {};
      globalThis.fetch = async (_url, init) => {
        input = JSON.parse(String(init?.body)).input;
        return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }));
      };
      const opts = { projectId: 1, ...required, ...(value === undefined ? {} : { [flag]: value }) };
      const ctx = createRuntimeContext(command, opts, { host, format: 'json' });
      await command.dryRun!(ctx);
      assert.equal(Object.hasOwn(input, field), value !== undefined);
      assert.equal(input[field], value);
    });
  }
}
