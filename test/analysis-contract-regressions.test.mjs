import assert from 'node:assert/strict';
import { reportUpdate } from '../src/commands/te-analysis/report/update.ts';
import { drilldownUserEventsRun } from '../src/commands/te-analysis/drilldown-user-events/run.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { registerCapabilityGatewayRoute } from '../src/core/capability-routing.ts';

const HOST = 'https://ta.example';
registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });

function ctx(values) {
  return {
    str(name) {
      const value = values[name];
      return value === undefined || value === null ? '' : String(value);
    },
    num(name) {
      return Number(values[name]);
    },
    optionalNum(name) {
      const value = values[name];
      return value === undefined || value === null || value === '' ? undefined : Number(value);
    },
    bool(name) {
      return Boolean(values[name]);
    },
    json(name) {
      const value = values[name];
      if (value === undefined || value === null || value === '') return undefined;
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    host() {
      return HOST;
    },
    mcpUrl() {
      return undefined;
    },
    service() {
      return 'analysis';
    },
  };
}

async function captureDryRun(command, values) {
  let body;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  setCliTokenManual('cli_test_token', HOST);
  try {
    await command.dryRun(ctx(values));
    return body;
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(HOST);
  }
}

const updateReport = await captureDryRun(reportUpdate, {
  'project-id': 1,
  'report-id': 2,
  'report-version': 0,
  'report-name': 'Renamed',
});
assert.equal(updateReport.input.version, 0);

const drilldown = await captureDryRun(drilldownUserEventsRun, {
  'drilldown-context-id': 'drill_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'user-id': 'u1',
  limit: 20,
});
assert.equal(drilldown.input.limit, 20);
assert.equal('page_num' in drilldown.input, false);
assert.equal('page_size' in drilldown.input, false);

console.log('OK: analysis contract regression dry-runs passed.');
