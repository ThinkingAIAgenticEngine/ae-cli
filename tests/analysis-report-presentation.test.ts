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
      ...(id === 'analysis.adhoc.export' ? { run_id: 'formula-test-run', artifact_id: 'formula-test-artifact' } : {}),
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

test('dashboard frame size is card-scoped and requires the fresh dashboard version', async () => {
  for (const frameSize of ['medium', 'large']) {
    const result = await dispatch('analysis.dashboard_report.update', {
      'project-id': 1, 'dashboard-id': 22, 'report-id': 11,
      'frame-size': frameSize, 'reports-version': 0,
    });
    assert.deepEqual(result.body.input, {
      project_id: 1, dashboard_id: 22, report_id: 11,
      frame_size: frameSize, reports_version: 0,
    });
    assert.equal('presentation' in result.body.input, false);
  }
});

test('card position uses explicit grid coordinates and can be combined with size and presentation', async () => {
  const values = {
    'project-id': 1, 'dashboard-id': 22, 'report-id': 11,
    'position-x': 0, 'position-y': 20, 'frame-size': 'large', 'reports-version': 7,
    'chart-type': 'table', 'date-outside': false,
  };
  for (const mode of ['dryRun', 'validateInput', 'execute'] as const) {
    const result = await dispatch('analysis.dashboard_report.update', values, mode);
    assert.deepEqual(result.body.input, {
      project_id: 1, dashboard_id: 22, report_id: 11,
      frame_size: 'large', position: { x: 0, y: 20 }, reports_version: 7,
      presentation: { chart_type: 'table', date_outside: false },
    });
  }
});

test('card layout flags reject incomplete coordinates, invalid sizes and unsafe numbers before dispatch', () => {
  const cmd = command('analysis.dashboard_report.update');
  const base = { 'project-id': 1, 'dashboard-id': 22, 'report-id': 11, 'reports-version': 7 };
  for (const size of ['small', 'invalid', '1']) {
    assert.throws(() => cmd.validate!(context({ ...base, 'frame-size': size })), /frame-size/);
  }
  assert.throws(() => cmd.validate!(context({ ...base, 'position-x': 0 })), /position-x.*position-y/);
  assert.throws(() => cmd.validate!(context({ ...base, 'position-y': 0 })), /position-x.*position-y/);
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => cmd.validate!(context({ ...base, 'position-x': value, 'position-y': 0 })), /position-x/);
    assert.throws(() => cmd.validate!(context({ ...base, 'position-x': 0, 'position-y': value })), /position-y/);
    assert.throws(() => cmd.validate!(context({ ...base, 'frame-size': 'medium', 'reports-version': value })), /reports-version/);
  }
  assert.throws(() => cmd.validate!(context({ ...base, 'position-x': 20, 'position-y': 0 })), /position-x/);
  assert.throws(() => cmd.validate!(context({ ...base, 'position-x': 0, 'position-y': 10001 })), /position-y/);
  assert.doesNotThrow(() => cmd.validate!(context({ ...base, 'position-x': 0, 'position-y': 10000 })));
  assert.throws(() => cmd.validate!(context({ ...base, 'frame-size': 'medium', 'reports-version': Number.MAX_SAFE_INTEGER })), /reports-version/);
  assert.throws(() => cmd.validate!(context({ 'project-id': 1, 'dashboard-id': 22, 'report-id': 11, 'frame-size': 'medium' })), /reports-version/);
  assert.throws(() => cmd.validate!(context({ 'project-id': 1, 'dashboard-id': 22, 'report-id': 11, 'position-x': 0, 'position-y': 0 })), /reports-version/);
  assert.throws(() => cmd.validate!(context(base)), /At least one/);
});

test('saved-metric formula dependencies are forwarded without invented aggregation or property', async () => {
  const definition = {
    time_range: { mode: 'previous', unit: 'day', value: 7 },
    metrics: [
      { event: 'diamond_recharge_total' },
      { event: 'diamond_recharge_third' },
      { formula: 'third / total', dependencies: [
        { alias: 'third', event: 'diamond_recharge_third' },
        { alias: 'total', event: 'diamond_recharge_total' },
      ] },
    ],
  };
  for (const id of ['analysis.report.create', 'analysis.report.update', 'analysis.adhoc.run', 'analysis.adhoc.export']) {
    const result = await dispatch(id, {
      'project-id': 1, 'model-type': 'event', definition,
      'report-name': 'Saved metric ratio', 'report-id': 11, 'report-version': 2,
    });
    assert.deepEqual(result.body.input.definition, definition);
  }
});

test('formula operand filters retain their exact scope at every definition entrypoint', async () => {
  const festival = { field: { type: 'event_property', name: 'festival_name' }, operator: 'eq', values: ['spring'] };
  const win = { field: { type: 'event_property', name: 'win' }, operator: 'is_true' };
  const cases = [
    { formula: 'completed / participants', dependencies: [
      { alias: 'completed', event: 'activity_dungeon', aggregation: 'total_count', filters: [festival, win], relation: 'and' },
      { alias: 'participants', event: 'char_login', aggregation: 'total_count' },
    ] },
    { formula: 'completed / participants', dependencies: [
      { alias: 'completed', event: 'activity_dungeon', aggregation: 'total_count' },
      { alias: 'participants', event: 'char_login', aggregation: 'total_count', filters: [festival] },
    ] },
    { formula: 'completed / participants', dependencies: [
      { alias: 'completed', event: 'activity_dungeon', aggregation: 'total_count', filters: [win] },
      { alias: 'participants', event: 'char_login', aggregation: 'total_count', filters: [festival] },
    ] },
    { formula: '(won + won) / all', dependencies: [
      { alias: 'won', event: 'activity_dungeon', aggregation: 'total_count', relation: 'or', filters: [
        { relation: 'and', items: [festival, win] },
        { ...festival, values: ['autumn'] },
      ] },
      { alias: 'all', event: 'activity_dungeon', aggregation: 'total_count', filters: [{ ...win, operator: 'is_false' }] },
    ] },
  ];
  for (const metric of cases) {
    const definition = { time_range: { mode: 'previous', unit: 'day', value: 7 }, metrics: [metric] };
    for (const id of ['analysis.report.create', 'analysis.report.update', 'analysis.adhoc.run', 'analysis.adhoc.export']) {
      for (const mode of ['dryRun', 'execute'] as const) {
        const result = await dispatch(id, {
          'project-id': 1, 'model-type': 'event', definition: JSON.stringify(definition),
          'report-name': 'Operand filters', 'report-id': 11, 'report-version': 2,
        }, mode);
        assert.deepEqual(result.body.input.definition, definition);
        assert.equal('filters' in result.body.input.definition, false);
        assert.equal('filters' in result.body.input.definition.metrics[0], false);
      }
    }
  }
});

test('native formula readback is forwarded unchanged without inventing dependencies', async () => {
  const metric = {
    formula: 'activity_dungeon.A101 / char_login.A101', formulation: {
      appData: 'saved-formula-ui-state', formulationDeps: [
        { event: { eventName: 'activity_dungeon' }, quota: { quotaName: 'A101' } },
        { event: { eventName: 'char_login' }, quota: { quotaName: 'A101' } },
      ],
    },
    custom_event_desc: 'native formula', event_desc: 'kept', format: 'percent',
    custom_filters: [{ index: 0, relation: '1', filts: [{ filterType: 'SIMPLE', columnName: 'win',
      tableType: '0', selectType: 'bool', calcuSymbol: 'C09' }] }],
    event_type: 'event_v', event_split_indexes: [0, 1],
    quota_time_ranges: [{ index: 0, type: 'LAST_DAYS', params: ['3'] }],
    quota_entities: [{ index: 0, taIdMeasure: { entityId: 42, columnName: 'device_id', tableType: '0', selectType: 'string' } }],
    event_uuid: 'saved-event-uuid',
  };
  const definition = { metrics: [metric] };
  const result = await dispatch('analysis.report.update', {
    'project-id': 1, 'report-id': 11, 'report-version': 2, 'model-type': 'event', definition,
  }, 'execute');
  assert.deepEqual(result.body.input.definition, definition);
  assert.equal('dependencies' in result.body.input.definition.metrics[0], false);
});

test('Agent reference teaches operand-scoped formula filters rather than changing the denominator', () => {
  const reference = readFileSync(new URL('../skills/ae-analysis/references/ai_models/event.md', import.meta.url), 'utf8');
  const section = reference.split('## Formula operand filters')[1]?.split('\n## ')[0];
  assert.ok(section, 'Formula operand filters need a dedicated reference section');
  const example = section.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(example, 'The operand filter contract needs a valid JSON example');
  const definition = JSON.parse(example[1]);
  const metric = definition.metrics[0];
  assert.equal(metric.formula, 'completed / participants');
  assert.equal(metric.dependencies[0].event, 'activity_dungeon');
  assert.equal(metric.dependencies[0].relation, 'and');
  assert.deepEqual(metric.dependencies[0].filters[0].values, ['spring']);
  assert.equal(metric.dependencies[0].filters[1].operator, 'is_true');
  assert.equal('values' in metric.dependencies[0].filters[1], false);
  assert.equal(metric.dependencies[1].event, 'char_login');
  assert.equal('filters' in metric.dependencies[1], false);
  assert.equal('filters' in metric, false);
  assert.equal('filters' in definition, false);
  assert.match(section, /Do not move operand filters/);
  assert.match(section, /repeated occurrences/);
  assert.match(section, /custom_filters/);
  assert.match(section, /saved metric/);
});

test('saved metric reference contract preserves common and local filters before formula reuse', () => {
  const references = new URL('../skills/ae-analysis/references/', import.meta.url);
  const create = readFileSync(new URL('metric_create.md', references), 'utf8');
  const update = readFileSync(new URL('metric_update.md', references), 'utf8');
  const get = readFileSync(new URL('metric_get.md', references), 'utf8');
  const event = readFileSync(new URL('ai_models/event.md', references), 'utf8');
  const section = create.split('## Saved metric filters')[1]?.split('\n## ')[0];
  assert.ok(section, 'metric creation must explain which filter scope is saved');
  const example = section.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(example, 'show a complete semantic definition with common and local filters');
  const definition = JSON.parse(example[1]);
  assert.equal(definition.metrics.length, 1);
  assert.equal(definition.relation, 'or');
  assert.deepEqual(definition.filters.map((filter: any) => filter.values), [['US'], ['GB']]);
  assert.equal(definition.metrics[0].relation, 'and');
  assert.equal(definition.metrics[0].filters[0].field.name, 'elapsed_ms');
  assert.equal(definition.metrics[0].filters[0].operator, 'lte');
  assert.deepEqual(definition.metrics[0].filters[0].values, [3000]);
  assert.match(section, /combined with AND/);
  assert.match(section, /each scope's.*relation.*compound/is);
  assert.match(section, /Do not put.*filter.*metric_params/is);
  assert.match(section, /non-empty.*`filts`.*`filters`.*rejected/is);
  assert.match(section, /older.*backend.*discard|backend.*older.*discard/is);
  assert.match(update, /native QP.*semantic.*not supported/is);
  assert.match(get, /verify.*saved.*filters/is);
  assert.match(event, /saved metric's own filters.*different.*adding.*filters.*dependency/is);
});

test('card layout conflicts keep the gateway error without retrying a write', async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  setCliTokenManual('presentation-test-token', host);
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return new Response(JSON.stringify({ ok: false, error: {
      type: 'validation', code: 'LAYOUT_CONFLICT',
      message: 'The board layout changed.', hint: 'Reread the card before choosing another update.',
    } }), { status: 409 });
  };
  try {
    await assert.rejects(() => command('analysis.dashboard_report.update').execute(context({
      'project-id': 1, 'dashboard-id': 22, 'report-id': 11,
      'frame-size': 'medium', 'reports-version': 0,
    })), (error: any) => {
      assert.equal(error.code, 'LAYOUT_CONFLICT');
      assert.match(error.hint, /Reread/);
      return true;
    });
    assert.equal(requests.filter((url) => url.endsWith('/analysis.dashboard_report.update/execute')).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
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
  for (const flag of ['--chart-type', '--table-layout', '--date-outside', '--frame-size', '--position-x', '--position-y', '--reports-version']) assert.ok(help.includes(flag));
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
  assert.match(read('references/dashboard_report_get.md'), /reports_version/);
  assert.match(read('references/dashboard_report_update.md'), /--frame-size medium/);
  assert.match(read('references/dashboard_report_update.md'), /--position-x/);
  assert.match(read('references/dashboard_report_update.md'), /occupied destinations/);
  assert.match(read('references/ai_models/event.md'), /Saved metrics as formula operands/);
  assert.match(read('references/ai_models/event.md'), /Omit `aggregation`, `property`, and `percentile`/);
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
