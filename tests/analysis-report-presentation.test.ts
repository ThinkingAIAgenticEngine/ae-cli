/** Saved event-report and dashboard-card presentation regression tests. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Command, RuntimeContext } from '../src/framework/types.js';
import { baseCommands } from '../src/commands/te-analysis/index.js';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.js';

const host = 'https://presentation.example.com';
function command(id: string): Command {
  const found = baseCommands.find((item) => item.capabilityId === id);
  assert.ok(found, `Missing registered command ${id}`);
  return found;
}
function context(values: Record<string, unknown>): RuntimeContext {
  return {
    has: (name) => Object.hasOwn(values, name),
    str: (name) => values[name] === undefined ? '' : String(values[name]),
    num: (name) => Number(values[name]),
    optionalNum: (name) => values[name] === undefined ? undefined : Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => typeof values[name] === 'string' ? JSON.parse(String(values[name])) : values[name],
    list: () => [], host: () => host, mcpUrl: () => undefined, service: () => 'analysis',
    communityReport: async () => ({}), localDataUpload: async () => ({}), out: async () => undefined,
  };
}
async function dispatch(id: string, values: Record<string, unknown>, mode: 'dryRun' | 'execute' | 'validateInput' = 'dryRun', responsePresentation?: Record<string, unknown>) {
  const cmd = command(id);
  const ctx = context(values);
  cmd.validate?.(ctx);
  let request: { url: string; body: any } | undefined;
  const originalFetch = globalThis.fetch;
  setCliTokenManual('presentation-test-token', host);
  globalThis.fetch = async (url, init) => {
    request = { url: String(url), body: JSON.parse(String(init?.body)) };
    return new Response(JSON.stringify({ ok: true, data: {
      report_id: 11, model_type: 'event', presentation: responsePresentation ?? { chart_type: 'bar', table_layout: 'event' },
    } }), { status: 200 });
  };
  try {
    const result = await cmd[mode]!(ctx);
    assert.ok(request);
    return { ...request, result };
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
}

test('report create forwards presentation separately from the AI-facing definition', async () => {
  const definition = { metrics: [{ event: 'login', aggregation: 'user_count' }] };
  const presentation = { chart_type: 'bar', table_layout: 'event' };
  const result = await dispatch('analysis.report.create', {
    'project-id': 1, 'report-name': 'Presentation', 'model-type': 'event', definition, presentation,
  });
  assert.ok(command('analysis.report.create').flags.some((flag) => flag.name === 'presentation'));
  assert.deepEqual(result.body.input.presentation, presentation);
  assert.deepEqual(result.body.input.definition, definition);
  assert.equal('presentation' in result.body.input.definition, false);
});

test('report update accepts presentation-only without replacing the definition or model', async () => {
  const result = await dispatch('analysis.report.update', {
    'project-id': 1, 'report-id': 11, 'report-version': 2, presentation: { table_layout: 'group' },
  });
  assert.deepEqual(result.body.input, {
    project_id: 1, report_id: 11, version: 2, presentation: { table_layout: 'group' },
  });
});

test('same-model definition replacement omits presentation to preserve the saved display', async () => {
  const result = await dispatch('analysis.report.update', {
    'project-id': 1, 'report-id': 11, 'report-version': 2,
    'model-type': 'event', definition: { metrics: [{ event: 'login', aggregation: 'total_count' }] },
  });
  assert.equal('presentation' in result.body.input, false);
});

test('event combo creation forwards metric-indexed series independently of metric definitions', async () => {
  const definition = { time_particle_size: 'day', metrics: [
    { event: 'purchase', aggregation: 'sum', property: 'amount' },
    { event: 'login', aggregation: 'user_count' },
  ] };
  const presentation = { chart_type: 'combo', series: [
    { metric_index: 1, type: 'bar', axis: 'primary' },
    { metric_index: 2, type: 'line', axis: 'secondary' },
  ] };
  const result = await dispatch('analysis.report.create', {
    'project-id': 1, 'report-name': 'Combo', 'model-type': 'event', definition, presentation,
  });
  assert.deepEqual(result.body.input.definition, definition);
  assert.deepEqual(result.body.input.presentation, presentation);
});

test('series-only updates preserve subset patches and explicit empty reset arrays', async () => {
  for (const series of [[{ metric_index: 2, type: 'bar', axis: 'secondary' }], []]) {
    const result = await dispatch('analysis.report.update', {
      'project-id': 1, 'report-id': 11, 'report-version': 5, presentation: { series },
    });
    assert.deepEqual(result.body.input, { project_id: 1, report_id: 11, version: 5, presentation: { series } });
  }
});

test('series patches reject malformed bindings before dispatch without guessing saved metric counts', () => {
  const cmd = command('analysis.report.update');
  const base = { 'project-id': 1, 'report-id': 11, 'report-version': 5 };
  const valid = { metric_index: 1, type: 'bar', axis: 'primary' };
  for (const series of [
    null, {}, [null], [{ metric_index: 1, type: 'bar' }], [{ ...valid, metric_index: 0 }],
    [{ ...valid, metric_index: 1.5 }], [{ ...valid, type: 'pie' }], [{ ...valid, axis: 'left' }],
    [{ ...valid, metric_uuid: 'raw' }], [valid, { ...valid, type: 'line' }],
  ]) {
    assert.throws(() => cmd.validate!(context({ ...base, presentation: { series } })), /presentation.*series/);
  }
  assert.doesNotThrow(() => cmd.validate!(context({ ...base, presentation: { series: [{ ...valid, metric_index: 2 }] } })));
});

test('pure line reset is explicit and absent presentation never implicitly resets series', async () => {
  const result = await dispatch('analysis.report.update', {
    'project-id': 1, 'report-id': 11, 'report-version': 5, presentation: { chart_type: 'line' },
  });
  assert.deepEqual(result.body.input.presentation, { chart_type: 'line' });
  const renamed = await dispatch('analysis.report.update', {
    'project-id': 1, 'report-id': 11, 'report-version': 5, 'report-name': 'Keep combo',
  });
  assert.equal('presentation' in renamed.body.input, false);
});

test('unsafe series preservation keeps the backend conflict and reset hint without retrying', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  setCliTokenManual('presentation-test-token', host);
  globalThis.fetch = async (url) => {
    if (!String(url).endsWith('/capabilities/analysis.report.update/execute')) {
      return new Response(JSON.stringify({ ok: true, data: { valid: true } }), { status: 200 });
    }
    calls += 1;
    return new Response(JSON.stringify({ ok: false, error: {
      type: 'validation', code: 'SERIES_PRESERVATION_CONFLICT',
      message: 'A non-default saved series cannot be matched uniquely.',
      hint: 'Reset with chart_type=line or series=[] before configuring the new metric order.',
    } }), { status: 422 });
  };
  try {
    await assert.rejects(() => command('analysis.report.update').execute(context({
      'project-id': 1, 'report-id': 11, 'report-version': 5,
      'model-type': 'event', definition: { metrics: [{ event: 'changed', aggregation: 'total_count' }] },
    })), (error: any) => {
      assert.equal(error.code, 'SERIES_PRESERVATION_CONFLICT');
      assert.equal(error.type, 'validation');
      assert.match(error.hint, /chart_type=line.*series=\[\]/);
      return true;
    });
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
});

test('semantic event chart names and every table layout are forwarded without internal codes', async () => {
  for (const chartType of ['line', 'bar', 'stacked', 'cumulative', 'pie']) {
    const result = await dispatch('analysis.report.update', {
      'project-id': 1, 'report-id': 11, 'report-version': 2, presentation: { chart_type: chartType },
    });
    assert.deepEqual(result.body.input.presentation, { chart_type: chartType });
  }
  for (const tableLayout of ['date', 'event', 'group']) {
    const result = await dispatch('analysis.dashboard_report.update', {
      'project-id': 1, 'dashboard-id': 22, 'report-id': 11, 'table-layout': tableLayout,
    });
    assert.deepEqual(result.body.input.presentation, { table_layout: tableLayout });
  }
});

test('report validation rejects table and internal display fields before gateway dispatch', () => {
  const cmd = command('analysis.report.create');
  const base = { 'project-id': 1, 'report-name': 'Display', 'model-type': 'event', definition: { metrics: [] } };
  assert.throws(() => cmd.validate!(context({ ...base, presentation: { chart_type: 'table' } })), /dashboard-report update/);
  for (const presentation of [{ graphShape: 'L4' }, { table_layout: 'invalid' }, { chart_type: ['bar'] }, { table_layout: ['date'] }, {}, null, []]) {
    assert.throws(() => cmd.validate!(context({ ...base, presentation })), /presentation/);
  }
  assert.throws(() => cmd.validate!(context({ ...base, 'model-type': 'funnel', presentation: { chart_type: 'line' } })), /event/);
});

test('dashboard card get uses the exact dashboard and report IDs and read risk', async () => {
  const cmd = command('analysis.dashboard_report.get');
  assert.equal(cmd.risk, 'read');
  const result = await dispatch('analysis.dashboard_report.get', { 'project-id': 1, 'dashboard-id': 22, 'report-id': 11 });
  assert.equal(result.url, `${host}/api/cli/analysis/v1/capabilities/analysis.dashboard_report.get/dry-run`);
  assert.deepEqual(result.body.input, { project_id: 1, dashboard_id: 22, report_id: 11 });
});

test('dashboard card update maps typed flags into presentation and preserves explicit false', async () => {
  const cmd = command('analysis.dashboard_report.update');
  assert.equal(cmd.risk, 'write');
  const result = await dispatch('analysis.dashboard_report.update', {
    'project-id': 1, 'dashboard-id': 22, 'report-id': 11,
    'chart-type': 'table', 'table-layout': 'event', 'date-outside': false,
  });
  assert.equal(result.url, `${host}/api/cli/analysis/v1/capabilities/analysis.dashboard_report.update/dry-run`);
  assert.deepEqual(result.body.input, {
    project_id: 1, dashboard_id: 22, report_id: 11,
    presentation: { chart_type: 'table', table_layout: 'event', date_outside: false },
  });
});

test('dashboard card partial update omits every unspecified display field', async () => {
  const result = await dispatch('analysis.dashboard_report.update', {
    'project-id': 1, 'dashboard-id': 22, 'report-id': 11, 'date-outside': true,
  });
  assert.deepEqual(result.body.input.presentation, { date_outside: true });
});

test('dashboard combo selection is card-scoped and exposes no series mutation flag', async () => {
  const result = await dispatch('analysis.dashboard_report.update', {
    'project-id': 1, 'dashboard-id': 22, 'report-id': 11, 'chart-type': 'combo',
  });
  assert.deepEqual(result.body.input, {
    project_id: 1, dashboard_id: 22, report_id: 11, presentation: { chart_type: 'combo' },
  });
  assert.equal(command('analysis.dashboard_report.update').flags.some((flag) => flag.name === 'series'), false);
});

test('combo output keeps report-scoped series on report and dashboard reads', async () => {
  const presentation = { chart_type: 'combo', series_scope: 'report', series: [
    { metric_index: 1, type: 'bar', axis: 'primary' },
    { metric_index: 2, type: 'line', axis: 'secondary' },
  ] };
  for (const id of ['analysis.report.get', 'analysis.dashboard_report.get']) {
    const result = await dispatch(id, { 'project-id': 1, 'dashboard-id': 22, 'report-id': 11 }, 'execute', presentation);
    assert.deepEqual(JSON.parse(JSON.stringify((result.result as any).presentation)), presentation);
  }
});

test('card validate and execute use the same scoped presentation input as dry-run', async () => {
  const values = { 'project-id': 1, 'dashboard-id': 22, 'report-id': 11, 'chart-type': 'pie', 'date-outside': false };
  for (const [mode, endpoint] of [['validateInput', 'validate'], ['execute', 'execute']] as const) {
    const result = await dispatch('analysis.dashboard_report.update', values, mode);
    assert.equal(result.url, `${host}/api/cli/analysis/v1/capabilities/analysis.dashboard_report.update/${endpoint}`);
    assert.deepEqual(result.body.input, {
      project_id: 1, dashboard_id: 22, report_id: 11, presentation: { chart_type: 'pie', date_outside: false },
    });
  }
});

test('dashboard card update rejects empty updates and invalid model-specific display choices', () => {
  const cmd = command('analysis.dashboard_report.update');
  const base = { 'project-id': 1, 'dashboard-id': 22, 'report-id': 11 };
  assert.throws(() => cmd.validate!(context(base)), /At least one/);
  for (const value of ['invalid', 'L4', 'cumulative_sum']) {
    assert.throws(() => cmd.validate!(context({ ...base, 'chart-type': value })), /chart-type/);
  }
  assert.throws(() => cmd.validate!(context({ ...base, 'table-layout': 'invalid' })), /table-layout/);
});

test('report execute retains the server presentation in its returned output', async () => {
  const result = await dispatch('analysis.report.get', { 'project-id': 1, 'report-id': 11 }, 'execute');
  assert.equal((result.result as any).presentation.chart_type, 'bar');
  assert.equal((result.result as any).presentation.table_layout, 'event');
});

test('leaf help exposes presentation and distinguishes dashboard cards from report definitions', () => {
  for (const action of ['create', 'update']) {
    const help = execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/index.ts', '--no-update-check', 'analysis', 'report', action, '--help'], { encoding: 'utf8' });
    assert.match(help, /--presentation/);
    assert.match(help, /dashboard-report/);
    assert.match(help, /combo/);
    assert.match(help, /metric_index/);
  }
  const help = execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/index.ts', '--no-update-check', 'analysis', 'dashboard-report', 'update', '--help'], { encoding: 'utf8' });
  for (const flag of ['--chart-type', '--table-layout', '--date-outside']) assert.ok(help.includes(flag));
  assert.match(help, /event/);
  assert.match(help, /combo/);
});

test('Agent routing and references separate report charts, result tables and dashboard cards', () => {
  const read = (name: string) => readFileSync(`skills/ae-analysis/${name}`, 'utf8');
  assert.match(read('SKILL.md'), /dashboard-report get\/update/);
  assert.match(read('references/report_get.md'), /presentation.*chart_type.*table_layout/s);
  assert.match(read('references/report_update.md'), /same-model.*preserve.*presentation/is);
  assert.match(read('references/report_create.md'), /top-level.*presentation/is);
  assert.match(read('references/dashboard_report_get.md'), /L0/);
  assert.match(read('references/dashboard_report_update.md'), /--chart-type table/);
  assert.match(read('references/dashboard_report_update.md'), /--date-outside false/);
  assert.match(read('references/dashboard_report_get.md'), /absence means inherited\/unknown/);
  assert.match(read('references/dashboard_report_update.md'), /explicitly choose both `--table-layout` and `--date-outside`/);
  assert.match(read('references/report_create.md'), /event_report_presentation\.md/);
  assert.match(read('references/report_update.md'), /series.*subset patch/is);
  assert.match(read('references/report_update.md'), /\[\].*reset/is);
  assert.match(read('references/report_update.md'), /other.*L0.*cards/is);
  assert.match(read('references/dashboard_report_get.md'), /series_scope.*report/s);
  assert.match(read('references/dashboard_report_update.md'), /source.*already.*combo/is);
  const eventPresentation = read('references/event_report_presentation.md');
  assert.match(eventPresentation, /metric_index.*1-based.*definition\.metrics/s);
  assert.match(eventPresentation, /cumulative.*not.*combo/is);
  assert.match(eventPresentation, /pie.*L11.*not.*L2/is);
  assert.match(eventPresentation, /SERIES_PRESERVATION_CONFLICT/);
  assert.match(eventPresentation, /Line, combo, and cumulative require a non-total time granularity/);
  assert.match(eventPresentation, /omits `time_particle_size` defaults to `total`/);
  assert.match(eventPresentation, /"time_particle_size":"day"/);
  assert.match(eventPresentation, /A non-empty series-only patch requires an existing compatible trend/);
  assert.match(eventPresentation, /empty `series: \[\]`.*non-trend.*keeping that current chart type/);
  assert.match(eventPresentation, /previously valid chart unavailable.*before writing/s);
});
