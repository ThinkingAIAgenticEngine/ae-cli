/**
 * DataOps integration command tests.
 *
 * Run:
 *   npx tsx tests/dataops-integration.test.ts
 */

import assert from 'node:assert/strict';
import type { RuntimeContext } from '../src/framework/types.js';
import { addSyncSolution } from '../src/commands/te-dataops/integration/add-sync-solution.js';
import { getTableStructure } from '../src/commands/te-dataops/integration/get-table-structure.js';

let pass = 0;
let fail = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    pass += 1;
    process.stdout.write(`  ok - ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stderr.write(`  FAIL - ${name}\n`);
    process.stderr.write(`        ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function ctx(values: Record<string, string>): RuntimeContext {
  return {
    str: (name) => values[name] ?? '',
    num: () => 0,
    optionalNum: () => undefined,
    bool: () => false,
    json: () => undefined,
    api: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => 'http://example.test',
    mcpUrl: () => undefined,
    service: () => 'dataops_integration',
    out: () => undefined,
  };
}

console.log('dataops integration');

test('get_table_structure exposes catalog flag', () => {
  assert.ok(getTableStructure.flags.some((flag) => flag.name === 'catalog'));
});

test('add_sync_solution does not expose confirmed flag', () => {
  assert.ok(!addSyncSolution.flags.some((flag) => flag.name === 'confirmed'));
});

test('add_sync_solution dry-run omits confirmed', () => {
  const dryRun = addSyncSolution.dryRun?.(ctx({
    spaceCode: 'cli',
    syncName: 'sync1',
    srcComponent: 'te_etl',
    srcDatasourceId: 'te_etl@TASK_ENGINE_TRINO',
    sinkComponent: 'ClickHouse',
    sinkDatasourceId: 'ds1',
    sourceConfig: '{"tableType":0}',
    sinkConfig: '{"database":"default"}',
  }));

  assert.ok(!('confirmed' in (dryRun?.body ?? {})));
});

test('get_table_structure dry-run includes catalog query param', () => {
  const dryRun = getTableStructure.dryRun?.(ctx({
    spaceCode: 'cli',
    datasourceId: 'ds1',
    catalog: 'sxy_catalog',
    database: 'sxy_db',
    tablePath: 'm_user_day_serial_3',
    env: 'DEV',
  }));

  assert.equal(dryRun?.params.catalog, 'sxy_catalog');
  assert.match(dryRun?.url ?? '', /catalog=sxy_catalog/);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
