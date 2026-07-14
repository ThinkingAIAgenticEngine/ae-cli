import { spawnSync } from 'child_process';

const ROOT = process.cwd();

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function runDryRun(command, args, requiredArgKeys) {
  const cliArgs = [
    'tsx',
    'src/index.ts',
    '--host', 'http://localhost',
    '--dry-run',
    'analysis',
    command,
    ...args,
  ];

  const result = spawnSync('npx', cliArgs, {
    cwd: ROOT,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || '');
    process.stderr.write(result.stdout || '');
    fail(`dry-run failed for analysis ${command}`);
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    fail(`dry-run output is not valid JSON for analysis ${command}`);
  }

  if (payload?.ok !== true) {
    fail(`dry-run did not return ok=true for analysis ${command}`);
  }

  const data = payload.data;
  if (data?.method !== 'tools/call') {
    fail(`unexpected method for analysis ${command}: ${data?.method}`);
  }

  if (!String(data?.url || '').includes('/mcp/analysis/http/analysis')) {
    fail(`unexpected dry-run url for analysis ${command}: ${data?.url}`);
  }

  if (data?.body?.name !== command.slice(1)) {
    fail(`unexpected tool name for analysis ${command}: ${data?.body?.name}`);
  }

  for (const key of requiredArgKeys) {
    if (data?.body?.arguments?.[key] === undefined) {
      fail(`missing required argument '${key}' in dry-run output for analysis ${command}`);
    }
  }
}

runDryRun('+build_event_analysis_qp', [
  '--project_id', '1',
  '--time_range', '{"mode":"previous","unit":"day","value":7}',
  '--metrics', '[{"event":"登录","aggregation":"user_count"}]',
  '--authenticated_only', 'true',
], ['projectId', 'timeRange', 'metrics', 'authenticatedOnly']);

runDryRun('+build_retention_analysis_qp', [
  '--project_id', '1',
  '--time_range', '{"mode":"previous","unit":"day","value":7}',
  '--retention', '{"initialEvent":"登录","returnEvent":"支付","unitNum":7}',
  '--authenticated_only', 'true',
], ['projectId', 'timeRange', 'retention', 'authenticatedOnly']);

runDryRun('+build_funnel_analysis_qp', [
  '--project_id', '1',
  '--time_range', '{"mode":"previous","unit":"day","value":7}',
  '--funnel', '{"steps":[{"event":"登录"},{"event":"支付"}]}',
  '--authenticated_only', 'true',
], ['projectId', 'timeRange', 'funnel', 'authenticatedOnly']);

runDryRun('+build_prop_analysis_qp', [
  '--project_id', '1',
  '--prop_analysis', '{"metric":{"aggregation":"user_count"}}',
  '--authenticated_only', 'true',
], ['projectId', 'propAnalysis', 'authenticatedOnly']);

runDryRun('+build_attribution_analysis_qp', [
  '--project_id', '1',
  '--time_range', '{"mode":"previous","unit":"day","value":7}',
  '--attribution', '{"targetEvent":"支付","targetAggregation":"total_count","attributionEvents":["广告点击"],"attributionModel":"last","window":{"value":7,"unit":"day"}}',
  '--authenticated_only', 'true',
], ['projectId', 'timeRange', 'attribution', 'authenticatedOnly']);

runDryRun('+build_distribution_analysis_qp', [
  '--project_id', '1',
  '--time_range', '{"mode":"previous","unit":"day","value":7}',
  '--distribution_metrics', '[{"event":"登录","aggregation":"A200"}]',
  '--authenticated_only', 'true',
], ['projectId', 'timeRange', 'distributionMetrics', 'authenticatedOnly']);

runDryRun('+build_heat_map_analysis_qp', [
  '--project_id', '1',
  '--time_range', '{"mode":"previous","unit":"day","value":7}',
  '--heat_map', '{"hotEvent":"点击","hotAggregation":"total_count","xProp":"x","yProp":"y"}',
  '--authenticated_only', 'true',
], ['projectId', 'timeRange', 'heatMap', 'authenticatedOnly']);

runDryRun('+build_interval_analysis_qp', [
  '--project_id', '1',
  '--time_range', '{"mode":"previous","unit":"day","value":7}',
  '--interval', '{"initialEvent":"登录","returnEvent":"支付","window":{"value":7,"unit":"day"}}',
  '--authenticated_only', 'true',
], ['projectId', 'timeRange', 'interval', 'authenticatedOnly']);

runDryRun('+build_path_analysis_qp', [
  '--project_id', '1',
  '--time_range', '{"mode":"previous","unit":"day","value":7}',
  '--path', '{"sourceEvent":"登录","eventNames":["登录","支付"],"sessionInterval":30,"sessionUnit":"minute"}',
  '--authenticated_only', 'true',
], ['projectId', 'timeRange', 'path', 'authenticatedOnly']);

runDryRun('+build_rank_list_analysis_qp', [
  '--project_id', '1',
  '--time_range', '{"mode":"previous","unit":"day","value":7}',
  '--rank_list', '{"rankDimension":{"name":"商品","type":"event_property"},"rankEvent":"支付","rankAggregation":"total_count"}',
  '--authenticated_only', 'true',
], ['projectId', 'timeRange', 'rankList', 'authenticatedOnly']);

console.log('OK: verified 10 analysis builder dry-run commands are executable and mapped correctly.');
