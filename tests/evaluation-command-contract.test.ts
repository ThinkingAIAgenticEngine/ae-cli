import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluationOperations, normalizedOperation } from '../scripts/evaluation-api-contract.mjs';
import commands, {
  createRun,
  updateRun,
  batchCreateDatasetFields,
  batchCreateDatasetCases,
  listTeClaudeCatalog,
  selectRunEvaluators,
  runCases,
  validateRun,
  createCredential,
  saveTeReportConfig,
  saveAiMonitorConnection,
  importAiMonitorTraces,
  publishDatasetVersion,
  publishEvaluatorVersion,
  retryFailedRunCases,
  retryRunCaseTrace,
  deleteCalibrationCase,
  transferRunOwner,
} from '../src/commands/evaluation/index.ts';
import { CliValidationError } from '../src/core/errors.js';
import { EVAL_API_PREFIX } from '../src/commands/evaluation/shared.ts';

const BASE = `https://ae.example.com${EVAL_API_PREFIX}`;

function fakeCtx(flags: Record<string, unknown>) {
  return {
    host: () => 'https://ae.example.com',
    str: (name: string) => (flags[name] === undefined ? '' : String(flags[name])),
    num: (name: string) => {
      if (flags[name] === undefined) throw new Error(`missing --${name}`);
      return Number(flags[name]);
    },
    optionalNum: (name: string) => (flags[name] === undefined ? undefined : Number(flags[name])),
    bool: (name: string) => Boolean(flags[name]),
    json: (name: string) => flags[name],
  } as any;
}

/**
 * Placeholders derived from each command's flag definitions so that dryRun can build a full
 * request. Commands with local shape validation get explicit fixtures. All commands, including
 * multipart import, must produce a request preview; failures are never swallowed silently.
 */
function placeholderFlags(command: { flags: any[] }): Record<string, unknown> {
  const jsonFixtures: Record<string, unknown> = {
    'evaluator-ids': ['018f0000-0000-7000-8000-000000000001'],
    'evaluator-versions-json': [{ evaluator_id: 'e', version_id: 'v' }],
    'field-filters-json': [{ field_key: 'f', text_equals: 'x' }],
    'field-ids': ['018f0000-0000-7000-8000-000000000002'],
    'tags-json': ['golden'],
    variables: ['input'],
    'members-json': [{ external_id: 'te-user', display_name: 'User' }],
    data: { input: 'x' },
    'fields-json': [{ display_name: 'Question', data_type: 'TEXT' }],
    'cases-json': [{ data: { input: 'x' } }],
    'selection-json': { mode: 'FILTER', start_time: '2026-01-01', end_time: '2026-01-02' },
    'session-claims-json': { user_id: 'u', te_user_id: 't', name: 'n', company_id: 'c' },
  };
  const stringFixtures: Record<string, unknown> = {
    type: 'AI_MONITOR_SESSION',
    'access-scope': 'COMPANY',
    role: 'member',
    status: 'ACTIVE',
    locale: 'en',
    'template-locale': 'en',
    'execution-mode': 'LIVE_AGENT',
  };
  const flags: Record<string, unknown> = {};
  for (const flag of command.flags) {
    if (flag.name === 'endpoint') continue;
    if (flag.type === 'json') flags[flag.name] = jsonFixtures[flag.name] ?? {};
    else if (flag.type === 'number') flags[flag.name] = flag.min ?? 0;
    else if (flag.type === 'boolean') flags[flag.name] = true;
    else flags[flag.name] = stringFixtures[flag.name] ?? 'contract-test';
  }
  return flags;
}

function cmd(name: string) {
  const found = commands.find((c: any) => c.command === name);
  assert.ok(found, `command ${name} must be registered`);
  return found as any;
}

// 1. Every registered command covers a current, non-excluded OpenAPI operation.
for (const command of commands) {
  assert.notEqual(command.usesAeHost, false, `${command.command} must support --host`);
}

const contract = JSON.parse(readFileSync(new URL('./fixtures/evaluation-api-operations.json', import.meta.url), 'utf8'));
if (process.env.EVAL_OPENAPI_PATH) {
  assert.deepEqual(evaluationOperations(readFileSync(process.env.EVAL_OPENAPI_PATH, 'utf8')), contract.operations,
    'Platform OpenAPI drift: review the changes and update the checked operation inventory');
}
for (const operation of Object.keys(contract.exclusions)) {
  assert.ok(contract.operations.some((op: any) => op.operation_id === operation), `stale API exclusion: ${operation}`);
}
const expectedOperations = new Set<string>(contract.operations
  .filter((op: any) => !contract.exclusions[op.operation_id])
  .map((op: any) => normalizedOperation(op.method, op.path)));
assert.equal(commands.length, expectedOperations.size);
assert.equal(new Set(commands.map((c: any) => `${c.resource || ''} ${c.command}`)).size, commands.length);
const coveredOperations = new Set<string>();
assert.equal(EVAL_API_PREFIX, '/agenteval/api/v1');
for (const command of commands as any[]) {
  assert.ok(!/[一-鿿]/.test(command.description), `non-english description in ${command.command}`);
  for (const flag of command.flags) {
    assert.ok(flag.desc, `flag --${flag.name} of ${command.command} has no desc`);
    assert.ok(!/[一-鿿]/.test(flag.desc), `non-english desc in ${command.command} --${flag.name}`);
  }
  assert.ok(command.dryRun, `missing dry-run for ${command.command}`);
  const result = await command.dryRun(fakeCtx(placeholderFlags(command)));
  assert.match(result.url, new RegExp(`^${BASE}/`), `bad dry-run url for ${command.command}`);
  assert.ok(!result.url.includes('//agenteval'), `duplicate prefix in ${command.command}: ${result.url}`);
  const route = normalizedOperation(result.method, new URL(result.url).pathname.replaceAll('contract-test', '{}'));
  assert.ok(expectedOperations.has(route), `unrecognized operation for ${command.resource || ''} ${command.command}: ${route}`);
  assert.ok(!coveredOperations.has(route), `duplicate operation: ${route}`);
  coveredOperations.add(route);
}

assert.deepEqual([...coveredOperations].sort(), [...expectedOperations].sort());

// Every path-bearing flag rejects traversal/query injection before a preview or request.
const pathFlags = new Set(['id', 'case-id', 'case-run-id', 'field-id', 'task-id', 'version-id']);
for (const command of commands) {
  for (const flag of command.flags.filter((flag) => pathFlags.has(flag.name))) {
    for (const malicious of ['../evaluator-templates/template-1/enable?', '%2e%2e%2fescape', 'x#fragment', 'x\\escape', '.', '..', 'x/y', 'x?query=1']) {
      await assert.rejects(async () => command.dryRun!(fakeCtx({ ...placeholderFlags(command), [flag.name]: malicious })),
        (error: unknown) => error instanceof CliValidationError && error.code === 'EVAL_RESOURCE_ID_INVALID',
        `${command.command} --${flag.name} must reject ${malicious}`);
    }
  }
}
assert.equal(cmd('+cancel_run').risk, 'high-risk-write');


// 2. +validate_run sends no body and has no lock-version flag
assert.ok(!validateRun.flags.some((f: any) => f.name === 'lock-version'));
const validateDry = validateRun.dryRun!(fakeCtx({ id: 'run-1' }));
assert.equal(validateDry.method, 'POST');
assert.equal(validateDry.url, `${BASE}/evaluation-runs/run-1/validate`);
assert.equal(validateDry.body, undefined);

// 3. +create_run / +update_run: dataset_version_id + PRESET_RESULT, no forced LIVE_AGENT
const preset = createRun.dryRun!(
  fakeCtx({ name: 'r', 'dataset-version-id': 'dv-1', 'execution-mode': 'PRESET_RESULT' }),
);
assert.equal(preset.body.dataset_version_id, 'dv-1');
assert.equal(preset.body.execution_mode, 'PRESET_RESULT');
assert.equal(preset.body.agent_config_id, undefined);
assert.equal(preset.body.model_config_id, undefined);
assert.throws(() =>
  createRun.dryRun!(
    fakeCtx({ name: 'r', 'execution-mode': 'PRESET_RESULT', 'agent-config-id': 'a-1' }),
  ),
);
const live = createRun.dryRun!(fakeCtx({ name: 'r', 'agent-config-id': 'a-1' }));
assert.equal(live.body.execution_mode, 'LIVE_AGENT');
const presetUpdate = updateRun.dryRun!(
  fakeCtx({ id: 'r1', name: 'r', 'dataset-version-id': 'dv-1', 'execution-mode': 'PRESET_RESULT', 'lock-version': 3 }),
);
assert.equal(presetUpdate.body.dataset_version_id, 'dv-1');
assert.equal(presetUpdate.body.execution_mode, 'PRESET_RESULT');
const sampled = createRun.dryRun!(fakeCtx({ name: 'r', 'case-sample-size': 25 }));
assert.equal(sampled.body.case_sample_size, 25);
const sampledUpdate = updateRun.dryRun!(
  fakeCtx({ id: 'r1', name: 'r', 'case-sample-size': 10, 'lock-version': 3 }),
);
assert.equal(sampledUpdate.body.case_sample_size, 10);
assert.throws(() => createRun.dryRun!(fakeCtx({ name: 'r', 'case-sample-size': 1.5 })));
assert.throws(() => createRun.dryRun!(fakeCtx({ name: 'r', 'case-sample-size': 1001 })));

// 3b. Dataset batch creates use the transactional batch routes and exact request envelopes
const batchFields = batchCreateDatasetFields.dryRun!(
  fakeCtx({ id: 'd1', 'fields-json': [{ display_name: 'Question', data_type: 'TEXT' }] }),
);
assert.equal(batchFields.url, `${BASE}/datasets/d1/fields/batch`);
assert.deepEqual(batchFields.body, { fields: [{ display_name: 'Question', data_type: 'TEXT' }] });
assert.throws(() => batchCreateDatasetFields.dryRun!(fakeCtx({ id: 'd1', 'fields-json': [] })));
assert.throws(() =>
  batchCreateDatasetFields.dryRun!(
    fakeCtx({ id: 'd1', 'fields-json': Array.from({ length: 101 }, () => ({ display_name: 'Field', data_type: 'TEXT' })) }),
  ),
);
assert.throws(() =>
  batchCreateDatasetFields.dryRun!(
    fakeCtx({ id: 'd1', 'fields-json': [{ display_name: 'Question', data_type: 'INVALID' }] }),
  ),
);
const batchCases = batchCreateDatasetCases.dryRun!(
  fakeCtx({ id: 'd1', 'cases-json': [{ data: { input: 'hello' } }] }),
);
assert.equal(batchCases.url, `${BASE}/datasets/d1/cases/batch`);
assert.deepEqual(batchCases.body, { cases: [{ data: { input: 'hello' } }] });
assert.throws(() => batchCreateDatasetCases.dryRun!(fakeCtx({ id: 'd1', 'cases-json': [{ data: [] }] })));
assert.throws(() =>
  batchCreateDatasetCases.dryRun!(
    fakeCtx({ id: 'd1', 'cases-json': Array.from({ length: 1001 }, () => ({ data: {} })) }),
  ),
);

// 3c. TE Claude catalog uses the login token by default and sends a legacy credential only when provided
const teCatalog = listTeClaudeCatalog.dryRun!(fakeCtx({ 'endpoint-url': 'https://claude.example.com' }));
assert.deepEqual(teCatalog.body, { endpoint_url: 'https://claude.example.com' });
const legacyTeCatalog = listTeClaudeCatalog.dryRun!(
  fakeCtx({ 'endpoint-url': 'https://claude.example.com', 'credential-id': 'c1' }),
);
assert.deepEqual(legacyTeCatalog.body, {
  endpoint_url: 'https://claude.example.com',
  credential_id: 'c1',
});

// 4. +select_run_evaluators sends evaluator_versions
const sel = selectRunEvaluators.dryRun!(
  fakeCtx({
    id: 'r1',
    'evaluator-ids': ['e1'],
    'evaluator-versions-json': [{ evaluator_id: 'e1', version_id: 'v1' }],
    'lock-version': 0,
  }),
);
assert.deepEqual(sel.body.evaluator_versions, [{ evaluator_id: 'e1', version_id: 'v1' }]);
assert.equal(sel.body.lock_version, 0);
const selNoVersions = selectRunEvaluators.dryRun!(
  fakeCtx({ id: 'r1', 'evaluator-ids': ['e1'], 'lock-version': 2 }),
);
assert.equal(selNoVersions.body.evaluator_versions, undefined);
assert.throws(() =>
  selectRunEvaluators.dryRun!(
    fakeCtx({ id: 'r1', 'evaluator-ids': ['e1'], 'evaluator-versions-json': [{ evaluator_id: 'e1' }], 'lock-version': 0 }),
  ),
);

// 5. +run_cases query mapping; field_filters serialized once
const rc = runCases.dryRun!(
  fakeCtx({
    id: 'r1',
    'evidence-completeness': 'PARTIAL',
    search: 'timeout',
    'evaluation-status': 'FAILED',
    'score-status': 'SUCCEEDED',
    'evaluator-id': 'ev1',
    'evaluator-ids': ['re1', 're2'],
    'score-gte': 0.2,
    'score-lte': 0.8,
    'field-filters-json': [{ field_key: 'region', text_equals: 'us' }],
    sort: 'EVALUATOR_SCORE',
    'sort-evaluator-id': 'ev1',
    offset: 5,
  }),
);
assert.equal(rc.url, `${BASE}/evaluation-runs/r1/cases`);
assert.deepEqual(rc.params, {
  evidence_completeness: 'PARTIAL',
  search: 'timeout',
  evaluation_status: 'FAILED',
  score_status: 'SUCCEEDED',
  evaluator_id: 'ev1',
  evaluator_ids: 're1,re2',
  score_gte: 0.2,
  score_lte: 0.8,
  field_filters: JSON.stringify([{ field_key: 'region', text_equals: 'us' }]),
  sort: 'EVALUATOR_SCORE',
  sort_evaluator_id: 'ev1',
  offset: 5,
});

// 6. AI_MONITOR_SESSION secrets never appear in dry-run output
const cred = createCredential.dryRun!(
  fakeCtx({
    name: 'c',
    type: 'AI_MONITOR_SESSION',
    'access-scope': 'COMPANY',
    role: 'member',
    status: 'ACTIVE',
    locale: 'en',
    'template-locale': 'en',
    secret: 's3cret',
    'data-token': 'dt0ken',
    'report-source': 'rs0urce',
  }),
);
assert.equal(cred.body.secret, '***redacted***');
assert.equal(cred.body.data_token, '***redacted***');
assert.equal(cred.body.report_source, '***redacted***');
assert.throws(() =>
  createCredential.dryRun!(fakeCtx({ name: 'c', type: 'AI_MONITOR_SESSION', secret: 's' })),
);
const plainCred = createCredential.dryRun!(fakeCtx({ name: 'c', type: 'BEARER_TOKEN', secret: 's' }));
assert.equal(plainCred.body.data_token, undefined);
assert.throws(() =>
  createCredential.dryRun!(fakeCtx({ name: 'c', type: 'BEARER_TOKEN', secret: 's', 'data-token': 'dt' })),
);

// 7. save_* lock_version omitted on create, sent on update including 0 (no truthy loss)
const saveCreate = saveTeReportConfig.dryRun!(fakeCtx({ 'base-url': 'https://te.example.com', 'app-id': 'app' }));
assert.equal(saveCreate.body.lock_version, undefined);
const saveUpdate = saveTeReportConfig.dryRun!(
  fakeCtx({ 'base-url': 'https://te.example.com', 'app-id': 'app', 'lock-version': 0 }),
);
assert.equal(saveUpdate.body.lock_version, 0);
const connCreate = saveAiMonitorConnection.dryRun!(
  fakeCtx({
    'base-url': 'https://ai.example.com',
    'credential-id': 'c1',
    'session-claims-json': { user_id: 'u', te_user_id: 't', name: 'n', company_id: 'co' },
  }),
);
assert.equal(connCreate.body.lock_version, undefined);
assert.equal(connCreate.body.session_claims, '***redacted***');
const connUpdate = saveAiMonitorConnection.dryRun!(
  fakeCtx({
    'base-url': 'https://ai.example.com',
    'credential-id': 'c1',
    'session-claims-json': { user_id: 'u', te_user_id: 't', name: 'n', company_id: 'co' },
    'lock-version': 0,
  }),
);
assert.equal(connUpdate.body.lock_version, 0);
assert.throws(() =>
  saveAiMonitorConnection.dryRun!(
    fakeCtx({ 'base-url': 'https://ai.example.com', 'credential-id': 'c1', 'session-claims-json': { user_id: 'u' } }),
  ),
);

// 7b. AI Monitor import selection validation + idempotency key
const imp = importAiMonitorTraces.dryRun!(
  fakeCtx({
    name: 'd',
    'selection-json': { mode: 'TRACE_IDS', trace_ids: ['t1'] },
    'idempotency-key': 'key-1',
  }),
);
assert.deepEqual((imp.body as any).selection, { mode: 'TRACE_IDS', trace_ids: ['t1'] });
assert.ok((imp.headers as any)['Idempotency-Key'] === 'key-1');
assert.throws(() =>
  importAiMonitorTraces.dryRun!(
    fakeCtx({ name: 'd', 'selection-json': { mode: 'TRACE_IDS', trace_ids: [] } }),
  ),
);

// 8. dataset/evaluator publish body is exactly {lock_version}
const pubDataset = publishDatasetVersion.dryRun!(fakeCtx({ id: 'd1', 'lock-version': 0 }));
assert.equal(pubDataset.url, `${BASE}/datasets/d1/versions`);
assert.deepEqual(pubDataset.body, { lock_version: 0 });
const pubEvaluator = publishEvaluatorVersion.dryRun!(fakeCtx({ id: 'e1', 'lock-version': 2 }));
assert.equal(pubEvaluator.url, `${BASE}/evaluators/e1/versions`);
assert.deepEqual(pubEvaluator.body, { lock_version: 2 });

// 9. retry failed cases body {lock_version}; trace retry has no body
const retry = retryFailedRunCases.dryRun!(fakeCtx({ id: 'r1', 'lock-version': 1 }));
assert.deepEqual(retry.body, { lock_version: 1 });
const traceRetry = retryRunCaseTrace.dryRun!(fakeCtx({ id: 'r1', 'case-run-id': 'c1' }));
assert.equal(traceRetry.body, undefined);
assert.equal(traceRetry.url, `${BASE}/evaluation-runs/r1/cases/c1/trace:retry`);

// 10. high-risk confirmation retained for delete/transfer
assert.equal(deleteCalibrationCase.risk, 'high-risk-write');
assert.equal(transferRunOwner.risk, 'high-risk-write');

// 11. sensitive query values stay out of the dry-run URL (params are separate, redaction at log layer)
const rcSearch = runCases.dryRun!(fakeCtx({ id: 'r1', search: 'private agent output' }));
assert.ok(!rcSearch.url.includes('search='));

// 12. content-bearing flags are marked sensitive so the command log redacts them
const sensitiveFlags = (command: string, flag: string) => {
  const target = cmd(command).flags.find((f: any) => f.name === flag);
  assert.ok(target, `flag --${flag} of ${command} is missing`);
  assert.equal(target.sensitive, true, `flag --${flag} of ${command} must be marked sensitive`);
};
sensitiveFlags('+import_ai_monitor_traces', 'selection-json');
sensitiveFlags('+run_cases', 'search');
sensitiveFlags('+run_cases', 'field-filters-json');
sensitiveFlags('+optimize_evaluator_prompt', 'prompt');
sensitiveFlags('+batch_create_dataset_cases', 'cases-json');

// 13. FILTER selection requires paired YYYY-MM-DD dates in order (server contract)
assert.throws(() =>
  importAiMonitorTraces.dryRun!(fakeCtx({ name: 'd', 'selection-json': { mode: 'FILTER' } })),
);
assert.throws(() =>
  importAiMonitorTraces.dryRun!(
    fakeCtx({ name: 'd', 'selection-json': { mode: 'FILTER', start_time: '2026-1-1', end_time: '2026-01-02' } }),
  ),
);
assert.throws(() =>
  importAiMonitorTraces.dryRun!(
    fakeCtx({ name: 'd', 'selection-json': { mode: 'FILTER', start_time: '2026-02-01', end_time: '2026-01-02' } }),
  ),
);
for (const invalidDate of ['2026-02-29', '2026-02-30', '2026-04-31', '1900-02-29', '2026-13-01', '2026-01-00']) {
  for (const dateField of ['start_time', 'end_time']) {
    assert.throws(
      () => importAiMonitorTraces.dryRun!(fakeCtx({
        name: 'd',
        'selection-json': { mode: 'FILTER', start_time: '2026-01-01', end_time: '2026-12-31', [dateField]: invalidDate },
      })),
      /requires start_time and end_time as YYYY-MM-DD dates/,
      `${dateField} must reject invalid calendar date ${invalidDate}`,
    );
  }
}
for (const validDate of ['2028-02-29', '2000-02-29', '2026-04-30']) {
  const selection = { mode: 'FILTER', start_time: validDate, end_time: validDate };
  const result = importAiMonitorTraces.dryRun!(fakeCtx({ name: 'd', 'selection-json': selection }));
  assert.deepEqual((result.body as any).selection, selection);
}
const impFilter = importAiMonitorTraces.dryRun!(
  fakeCtx({ name: 'd', 'selection-json': { mode: 'FILTER', start_time: '2026-01-01', end_time: '2026-01-02' } }),
);
assert.deepEqual((impFilter.body as any).selection, {
  mode: 'FILTER',
  start_time: '2026-01-01',
  end_time: '2026-01-02',
});

// Schedule updates forward the declared hour flag, including midnight, and preserve omission.
for (const hour of [9, 0, undefined]) {
  const schedule = cmd('+update_schedule').dryRun(fakeCtx({
    id: 'schedule-1',
    frequency: 'DAILY',
    'time-zone': 'Asia/Shanghai',
    'lock-version': 2,
    'minute-of-hour': 30,
    ...(hour === undefined ? {} : { 'hour-of-day': hour }),
  }));
  assert.equal(schedule.method, 'PATCH');
  assert.equal(schedule.url, `${BASE}/evaluation-run-schedules/schedule-1`);
  assert.deepEqual(schedule.body, {
    frequency: 'DAILY',
    time_zone: 'Asia/Shanghai',
    lock_version: 2,
    minute_of_hour: 30,
    ...(hour === undefined ? {} : { hour_of_day: hour }),
  });
}

console.log('evaluation command contract tests passed');

// New hierarchical commands use exact current-platform request contracts.
const resourceCommand = (resource: string, name: string) => {
  const found = commands.find((c) => c.resource === resource && c.command === name);
  assert.ok(found, `missing evaluation ${resource} ${name}`);
  return found;
};
for (const [resource, collection] of [['dataset', 'datasets'], ['evaluator', 'evaluators'], ['model-config', 'model-configs'], ['agent', 'agents']]) {
  const command = resourceCommand(resource, 'access-scope');
  assert.equal(command.risk, 'high-risk-write');
  for (const scope of ['PERSONAL', 'COMPANY']) {
    const request = await command.dryRun!(fakeCtx({ id: 'asset-1', 'access-scope': scope, 'lock-version': 0 }));
    assert.equal(request.method, 'PATCH');
    assert.equal(request.url, `${BASE}/${collection}/asset-1/access-scope`);
    assert.deepEqual(request.body, { access_scope: scope, lock_version: 0 });
  }
  assert.throws(() => command.dryRun!(fakeCtx({ id: 'asset', 'access-scope': 'SYSTEM', 'lock-version': 1 })));
}
for (const [name, suffix, method, flags, body, risk] of [
  ['list-candidates', '/candidates', 'GET', {}, undefined, 'read'],
  ['batch-add', '/batch-add', 'POST', { 'members-json': [{ external_id: 'te-42' }] }, { members: [{ external_id: 'te-42' }] }, 'high-risk-write'],
  ['change-role', '/user-1/role', 'PATCH', { role: 'member' }, { role: 'member' }, 'high-risk-write'],
  ['set-status', '/user-1', 'PATCH', { status: 'DISABLED' }, { status: 'DISABLED' }, 'high-risk-write'],
  ['remove', '/user-1', 'DELETE', {}, undefined, 'high-risk-write'],
] as const) {
  const command = resourceCommand('project-member', name);
  const request = await command.dryRun!(fakeCtx({ id: 'user-1', ...flags }));
  assert.equal(request.url, `${BASE}/projects/members${suffix}`);
  assert.equal(request.method, method);
  assert.deepEqual(request.body, body);
  assert.equal(command.risk, risk);
  assert.ok(!command.flags.some((f) => f.name === 'lock-version'));
}
for (const members of [[], [{}], [{ external_id: '' }], [{ external_id: 'te', display_name: 123 }], [{ external_id: 'te', role: 'root' }]]) {
  assert.throws(() => resourceCommand('project-member', 'batch-add').dryRun!(fakeCtx({ 'members-json': members })));
}
assert.throws(() => resourceCommand('project-member', 'change-role').dryRun!(fakeCtx({ id: 'user', role: 'root' })));
assert.throws(() => resourceCommand('project-member', 'set-status').dryRun!(fakeCtx({ id: 'user', status: 'DELETED' })));
const enable = await resourceCommand('evaluator-template', 'enable').dryRun!(fakeCtx({ id: 'template-1' }));
assert.equal(enable.method, 'POST');
assert.equal(enable.url, `${BASE}/evaluator-templates/template-1/enable`);
assert.equal(enable.body, undefined);
const localeList = await cmd('+list_evaluator_templates').dryRun(fakeCtx({ locale: 'en' }));
assert.deepEqual(localeList.params, { locale: 'en' });
const evaluatorWithLocale = await cmd('+create_evaluator').dryRun(fakeCtx({ name: 'judge', 'template-code': 'TOOL_TRACE_REASONABLENESS', 'template-locale': 'en' }));
assert.equal(evaluatorWithLocale.body.template_locale, 'en');
assert.equal(evaluatorWithLocale.body.template_code, 'TOOL_TRACE_REASONABLENESS');
assert.equal((await cmd('+create_evaluator').dryRun(fakeCtx({ name: 'judge' }))).body.template_locale, undefined);
const v6 = { schema_version: 'FIELD_MAPPING_V6', agent: { input: { source_type: 'DATASET_FIELD', field_key: 'input' } },
  evaluators: { 'judge-1': { execution_trace: { source_type: 'AGENT_EXECUTION_TRACE' }, tool_calls: { source_type: 'AGENT_TOOL_CALLS' } } } };
for (const name of ['+create_run', '+update_run', '+update_run_field_mapping']) {
  const request = await cmd(name).dryRun(fakeCtx({ id: 'run-1', name: 'run', 'lock-version': 0, 'field-mapping-json': v6 }));
  assert.deepEqual(request.body.field_mapping_json, v6);
}
const download = resourceCommand('file', 'download');
const downloadDry = await download.dryRun!(fakeCtx({ id: 'file-1', output: '/tmp/result.csv' }));
assert.equal(downloadDry.url, `${BASE}/files/file-1/content`);
assert.equal(downloadDry.method, 'GET');
assert.equal(downloadDry.output, '/tmp/result.csv');

// Exercise the command's authenticated download wiring without a live service.
const previousToken = process.env.AE_EVAL_ACCESS_TOKEN;
const previousFetch = globalThis.fetch;
const { mkdtemp, readFile, rm } = await import('node:fs/promises');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const downloadDir = await mkdtemp(join(tmpdir(), 'evaluation-command-'));
try {
  process.env.AE_EVAL_ACCESS_TOKEN = 'test-session';
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), `${BASE}/files/file-1/content`);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-session');
    assert.equal(new Headers(init?.headers).get('cli-token'), null);
    return new Response(new Uint8Array([0, 255, 42]));
  };
  // Unsafe routing and ID inputs must fail before the fetch spy can be reached.
  await assert.rejects(cmd('+test_model_config_connectivity').execute(fakeCtx({ id: '../evaluator-templates/template-1/enable?' })),
    (e: any) => e.code === 'EVAL_RESOURCE_ID_INVALID');
  await assert.rejects(cmd('+list_datasets').execute(fakeCtx({ endpoint: 'https://other.example.com' })),
    (e: any) => e.code === 'EVAL_ENDPOINT_OVERRIDE_UNSUPPORTED');
  const output = join(downloadDir, 'result.bin');
  assert.deepEqual(await download.execute(fakeCtx({ id: 'file-1', output })), { path: output, byte_size: 3 });
  assert.deepEqual(new Uint8Array(await readFile(output)), new Uint8Array([0, 255, 42]));
} finally {
  globalThis.fetch = previousFetch;
  if (previousToken === undefined) delete process.env.AE_EVAL_ACCESS_TOKEN;
  else process.env.AE_EVAL_ACCESS_TOKEN = previousToken;
  await rm(downloadDir, { recursive: true, force: true });
}
console.log('evaluation platform synchronization contract tests passed');
