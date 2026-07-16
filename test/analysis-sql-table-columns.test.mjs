import assert from 'node:assert/strict';
import { sqlTableColumns } from '../src/commands/te-analysis/sql-table/columns.ts';
import { registerCapabilityGatewayRoute } from '../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';

const host = 'https://ta.example';
registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
setCliTokenManual('cli-test-token', host);

let url;
let body;
const previousFetch = globalThis.fetch;
globalThis.fetch = async (requestUrl, init) => {
  url = String(requestUrl);
  body = JSON.parse(String(init.body));
  return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

try {
  const ctx = {
    str: (name) => name === 'table-ref' ? 'hive.ta.v_event_1' : '',
    num: (name) => name === 'project-id' ? 1 : 0,
    optionalNum: () => undefined,
    bool: () => false,
    json: () => undefined,
    host: () => host,
    mcpUrl: () => undefined,
    service: () => 'analysis',
  };
  await sqlTableColumns.dryRun(ctx);
  assert.equal(
    url,
    `${host}/api/cli/analysis/v1/capabilities/analysis.sql_table.columns/dry-run`,
  );
  assert.deepEqual(body.input, {
    project_id: 1,
    table_ref: 'hive.ta.v_event_1',
  });
} finally {
  globalThis.fetch = previousFetch;
  clearCliToken(host);
}

console.log('analysis sql-table columns tests passed');
