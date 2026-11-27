import crypto from 'node:crypto';
import path from 'node:path';
import { trustedProductHost } from './bootstrap-client.js';
import { CHECKOUT_RECOVERY, DEMO_SAMPLE_IDS, DEMO_STATUS, NETWORK_BUDGET_MS, RUN_BUDGET_MS, UUID_PATTERN,
  onboardingGrowthScenario, type LocalSession, type OnboardingInput, type ReadyDemoScope } from './contracts.js';
import type { OnboardingDependencies } from './runtime.js';
import type { OnboardingStore } from './session-store.js';
import { onboardingEvidenceLinks, onboardingInteraction } from './interaction.js';
import { audienceShareMarkdown, checkoutShareMarkdown, comparisonMarkdown, dailyViewerChangesMarkdown, purchasePathMarkdown } from './markdown-charts.js';

const GROWTH_VERSION = 2;
const CACHE_TTL_MS = 10 * 60_000;
const DAY_MS = 86_400_000;
const SAMPLE_DAYS = 7;
const VIEW = 'item_detail_view';
const CHECKOUT = 'checkout_start';
const PAYMENT = 'payment_success';
const fields = ['single_viewers', 'single_buyers', 'multi_viewers', 'multi_buyers', 'funnel_viewers',
  'funnel_checkout', 'funnel_buyers', 'account_ids_json', 'checkout_unpaid', 'checkout_account_ids_json', 'unmapped_accounts'] as const;

interface GrowthScope {
  sessionId: string;
  host: string;
  projectId: number;
  sampleId: string;
  itemId: string;
  startDate: string;
  endDate: string;
  zoneOffset: number;
}

interface GrowthEvidence extends GrowthScope {
  schemaVersion: 1;
  analysisVersion: number;
  verifiedAt: number;
  single_day: { viewers: number; buyers: number };
  multi_day: { viewers: number; buyers: number };
  funnel: { viewers: number; checkout: number; buyers: number };
  dailyViewers?: number[];
  accountIds: string[];
  checkoutAccountIds: string[];
}

type Call = (id: string, input: Record<string, unknown>) => Promise<any>;
type GrowthDependencies = Pick<OnboardingDependencies, 'capability' | 'credentialKey' | 'now' | 'webConversation'>;

function date(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function shiftDate(value: string, days: number): string {
  return new Date(Date.parse(value) + days * DAY_MS).toISOString().slice(0, 10);
}

function sampleDates(startDate: string): string[] {
  return Array.from({ length: SAMPLE_DAYS }, (_, index) => shiftDate(startDate, index));
}

function growthScope(session: LocalSession, demo: Partial<ReadyDemoScope>): GrowthScope | undefined {
  const { project_id, sample_id, item_id, start_date, end_date, zone_offset } = demo;
  if (!session.host || !sample_id || sample_id !== session.sample_id || typeof project_id !== 'number'
      || !Number.isSafeInteger(project_id) || project_id <= 0 || project_id === session.project_id
      || typeof item_id !== 'string' || !item_id.trim() || item_id.length > 128
      || !date(start_date) || !date(end_date) || Date.parse(end_date) - Date.parse(start_date) !== (SAMPLE_DAYS - 1) * DAY_MS
      || typeof zone_offset !== 'number' || !Number.isFinite(zone_offset) || Math.abs(zone_offset) > 14) return undefined;
  return { sessionId: session.id, host: trustedProductHost(session.host), projectId: project_id, sampleId: sample_id,
    itemId: item_id, startDate: start_date, endDate: end_date, zoneOffset: zone_offset };
}

function evidenceFile(scope: GrowthScope, credentialKey: string): string {
  const digest = crypto.createHash('sha256').update(JSON.stringify([GROWTH_VERSION, credentialKey, scope])).digest('hex');
  return `growth-${digest}.json`;
}

function readGrowthEvidence(store: OnboardingStore, file: string, scope: GrowthScope): GrowthEvidence | undefined {
  const evidence = store.read<GrowthEvidence>(file);
  if (evidence?.analysisVersion === GROWTH_VERSION && evidence.schemaVersion === 1
      && Object.entries(scope).every(([key, value]) => evidence[key as keyof GrowthScope] === value)
      && Array.isArray(evidence.accountIds) && Array.isArray(evidence.checkoutAccountIds)
      && evidence.single_day && evidence.multi_day && evidence.funnel) return evidence;
}

export function readCheckoutRecoveryCohort(store: OnboardingStore, session: LocalSession, demo: ReadyDemoScope) {
  const scope = growthScope(session, demo);
  if (!scope || !session.credential_key) return undefined;
  const evidence = readGrowthEvidence(store, evidenceFile(scope, session.credential_key), scope);
  if (!evidence) return undefined;
  return { start_date: scope.startDate, end_date: scope.endDate, zone_offset: scope.zoneOffset, account_ids: evidence.checkoutAccountIds };
}

export function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function verifiedTables(result: any, type: string): string[] {
  return result.items.filter((item: any) => item?.table_type === type && typeof item.sql_reference === 'string'
    && /^(?:"(?:[^"\u0000-\u001f]|"")+"\.){2}"(?:[^"\u0000-\u001f]|"")+"$/.test(item.sql_reference))
    .map((item: any) => item.sql_reference);
}

export async function resolveEventSource(call: Call, projectId: number): Promise<{
  from: string;
  account: string;
  eventColumns: ReadonlySet<string>;
}> {
  let offset = 0;
  const events = new Set<string>();
  const users = new Set<string>();
  const scope = { project_id: projectId, usage: 'analysis' };
  while (true) {
    const page = await call('analysis.sql_table.list', { ...scope, limit: 200, offset });
    if (!Array.isArray(page?.items) || typeof page.has_more !== 'boolean') throw new Error('AE did not return the authorized SQL tables.');
    verifiedTables(page, 'eventView').forEach(name => events.add(name));
    verifiedTables(page, 'userView').forEach(name => users.add(name));
    if (!page.has_more) break;
    if (!Number.isSafeInteger(page.next_offset) || page.next_offset <= offset) throw new Error('AE returned an invalid SQL table continuation.');
    offset = page.next_offset;
  }
  if (events.size !== 1) throw new Error('AE did not return exactly one authorized Demo event view.');
  const event = [...events][0];
  const readColumns = async (table_ref: string) => {
    const result = await call('analysis.sql_table.columns', { ...scope, table_ref });
    if (!Array.isArray(result?.columns)) throw new Error('AE did not return the authorized Demo columns.');
    return new Set<string>(result.columns.map((entry: { column: string }) => entry.column));
  };
  const columns = await readColumns(event);
  if (!['#event_time', '$part_date', '$part_event', 'plg_sample_id', 'item_id', 'plg_seed_event_id'].every(name => columns.has(name))) {
    throw new Error('The authorized Demo view is missing the fields required for growth analysis.');
  }
  if (columns.has('#account_id')) return { from: `${event} e`, account: 'e."#account_id"', eventColumns: columns };
  if (!columns.has('#user_id') || users.size !== 1) throw new Error('AE did not expose a verified Demo account-ID mapping.');
  const user = [...users][0];
  const userColumns = await readColumns(user);
  if (!userColumns.has('#user_id') || !userColumns.has('#account_id')) throw new Error('AE did not expose a verified Demo account-ID mapping.');
  return { from: `${event} e LEFT JOIN ${user} u ON e."#user_id" = u."#user_id"`, account: 'u."#account_id"', eventColumns: columns };
}

function growthSql(scope: GrowthScope, source: { from: string; account: string }): string {
  // Seed timestamps use the sample's local reporting dates. The seven-day seed window also bounds the full funnel.
  const dailyCounts = sampleDates(scope.startDate).map(day => `count_if(contains(view_dates, DATE '${day}'))`);
  return `WITH sample_events AS (
  SELECT NULLIF(CAST(${source.account} AS varchar), '') AS account_id,
         e."$part_event" AS event_name, e."#event_time" AS event_time
  FROM ${source.from}
  WHERE e."$part_date" BETWEEN '${shiftDate(scope.startDate, -1)}' AND '${shiftDate(scope.endDate, 1)}'
    AND e."#event_time" >= TIMESTAMP '${scope.startDate} 00:00:00'
    AND e."#event_time" < TIMESTAMP '${shiftDate(scope.endDate, 1)} 00:00:00'
    AND e.plg_sample_id = ${sqlString(scope.sampleId)} AND e.item_id = ${sqlString(scope.itemId)}
    AND e.plg_seed_event_id IS NOT NULL
    AND e."$part_event" IN ('${VIEW}', '${CHECKOUT}', '${PAYMENT}')
), views AS (
  SELECT *, min(CASE WHEN event_name = '${VIEW}' THEN event_time END) OVER (PARTITION BY account_id) AS first_view
  FROM sample_events
), checkouts AS (
  SELECT *, min(CASE WHEN event_name = '${CHECKOUT}' AND event_time > first_view THEN event_time END)
      OVER (PARTITION BY account_id) AS first_checkout
  FROM views
), activity AS (
  SELECT account_id, array_agg(DISTINCT CAST(event_time AS date)) FILTER (WHERE event_name = '${VIEW}') AS view_dates,
    count_if(event_name = '${PAYMENT}') > 0 AS bought,
    count_if(first_checkout IS NOT NULL) > 0 AS checked_out,
    count_if(event_name = '${PAYMENT}' AND event_time > first_checkout) > 0 AS paid_after_checkout
  FROM checkouts GROUP BY account_id
), accounts AS (
  SELECT *, COALESCE(cardinality(view_dates), 0) AS view_days FROM activity
)
SELECT count_if(view_days = 1) AS single_viewers, count_if(view_days = 1 AND bought) AS single_buyers,
       count_if(view_days >= 2) AS multi_viewers, count_if(view_days >= 2 AND bought) AS multi_buyers,
       count_if(view_days > 0) AS funnel_viewers, count_if(checked_out) AS funnel_checkout,
       count_if(paid_after_checkout) AS funnel_buyers,
       COALESCE(json_format(CAST(array_sort(array_agg(account_id) FILTER (WHERE view_days >= 2 AND NOT bought)) AS JSON)), '[]') AS account_ids_json,
       count_if(checked_out AND NOT bought) AS checkout_unpaid,
       COALESCE(json_format(CAST(array_sort(array_agg(account_id) FILTER (WHERE checked_out AND NOT bought)) AS JSON)), '[]') AS checkout_account_ids_json,
       count_if(account_id IS NULL) AS unmapped_accounts,
       json_format(CAST(ARRAY[${dailyCounts.join(', ')}] AS JSON)) AS daily_viewers_json
FROM accounts`;
}

function accountIds(value: unknown, expected: number): string[] {
  let ids: unknown;
  try { ids = typeof value === 'string' ? JSON.parse(value) : undefined; } catch { /* Validated below. */ }
  if (!Array.isArray(ids) || ids.length !== expected || new Set(ids).size !== ids.length
      || !ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 256 && id === id.trim())) {
    throw new Error('AE returned incomplete or inconsistent Demo growth evidence.');
  }
  return ids;
}

function parseDailyViewers(value: unknown, viewers: number): number[] | undefined {
  if (typeof value !== 'string') return undefined;
  let counts: unknown;
  try { counts = JSON.parse(value); } catch { return undefined; }
  if (!Array.isArray(counts) || counts.length !== SAMPLE_DAYS
      || !counts.every(count => Number.isSafeInteger(count) && count >= 0 && count <= viewers)
      || counts.reduce((sum, count) => sum + count, 0) < viewers) return undefined;
  return counts;
}

function parseGrowth(result: any, scope: GrowthScope, verifiedAt: number): GrowthEvidence {
  if (result?.has_more !== false || result.returned_rows !== 1 || result.rows?.length !== 1
      || !Array.isArray(result.title) || !Array.isArray(result.rows[0])) {
    throw new Error('AE did not return a complete Demo growth result.');
  }
  const row = Object.fromEntries(result.title.map((name: string, index: number) => [name, result.rows[0][index]]));
  if (!fields.every(field => Object.hasOwn(row, field))) throw new Error('AE did not return the expected Demo growth fields.');
  const count = (field: typeof fields[number]) => {
    const raw = row[field];
    const value = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('AE returned an invalid Demo growth count.');
    return value;
  };
  const single_day = { viewers: count('single_viewers'), buyers: count('single_buyers') };
  const multi_day = { viewers: count('multi_viewers'), buyers: count('multi_buyers') };
  const funnel = { viewers: count('funnel_viewers'), checkout: count('funnel_checkout'), buyers: count('funnel_buyers') };
  const checkoutUnpaid = count('checkout_unpaid');
  if (single_day.buyers > single_day.viewers || multi_day.buyers > multi_day.viewers || funnel.checkout > funnel.viewers
      || funnel.buyers + checkoutUnpaid > funnel.checkout
      || funnel.viewers !== single_day.viewers + multi_day.viewers || count('unmapped_accounts') !== 0 || funnel.viewers === 0) {
    throw new Error('AE returned incomplete or inconsistent Demo growth evidence.');
  }
  return { ...scope, schemaVersion: 1, analysisVersion: GROWTH_VERSION, verifiedAt, single_day, multi_day, funnel,
    dailyViewers: parseDailyViewers(row.daily_viewers_json, funnel.viewers),
    accountIds: accountIds(row.account_ids_json, multi_day.viewers - multi_day.buyers),
    checkoutAccountIds: accountIds(row.checkout_account_ids_json, checkoutUnpaid) };
}

export async function runOnboardingGrowth(store: OnboardingStore, deps: GrowthDependencies,
  input: OnboardingInput, preview: boolean): Promise<Record<string, unknown>> {
  const scenario = onboardingGrowthScenario(input.scenario);
  const sessionId = input.session_id;
  if (!sessionId || !UUID_PATTERN.test(sessionId)) throw new Error('A valid onboarding --session-id is required.');
  const explicitHost = input.host ? trustedProductHost(input.host) : undefined;
  const readSession = () => store.session(sessionId, explicitHost)!;
  if (preview) {
    const session = readSession();
    return { dry_run: true, session_id: sessionId, host: session.host ?? null, sample_id: session.sample_id ?? null, scenario,
      capabilities: [DEMO_STATUS, 'analysis.sql_table.list', 'analysis.sql_table.columns', 'analysis.adhoc.run'] };
  }

  const started = deps.now();
  const signal = AbortSignal.timeout(RUN_BUDGET_MS);
  return store.locked(`session:${sessionId}`, async () => {
    const session = readSession();
    const base = { session_id: sessionId, host: session.host ?? null, sample_id: session.sample_id ?? null, scenario };
    if (!session.host || !session.credential_key || session.requires_auth || deps.credentialKey(session.host) !== session.credential_key) {
      return { ...base, phase: 'action_required', next_action: 'resume_onboarding', poll_after_ms: 0,
        message: 'Resume onboarding with the signed-in account for this session.' };
    }
    const host = trustedProductHost(session.host);
    if (session.choice !== 'demo' || !session.sample_id || !DEMO_SAMPLE_IDS.some(sample => sample === session.sample_id)) {
      return { ...base, phase: 'action_required', next_action: 'choose_demo', poll_after_ms: 0,
        message: 'Select a supported Demo in this onboarding session.' };
    }
    const call: Call = async (id, body) => {
      signal.throwIfAborted();
      const request = new AbortController();
      const abort = () => request.abort();
      const timer = setTimeout(abort, NETWORK_BUDGET_MS);
      timer.unref();
      signal.addEventListener('abort', abort, { once: true });
      try {
        const result = await deps.capability(host, id, body, request.signal);
        request.signal.throwIfAborted();
        return result;
      } finally {
        signal.removeEventListener('abort', abort);
        clearTimeout(timer);
      }
    };
    try {
      const demo = await call(DEMO_STATUS, { sample_id: session.sample_id });
      if (typeof demo?.status !== 'string' || demo.sample_id !== session.sample_id) {
        throw new Error('AE did not confirm the selected Demo sample.');
      }
      if (demo.status !== 'ready') {
        return demo.status === 'action_required'
          ? { ...base, phase: 'action_required', next_action: 'inspect_demo_preparation', poll_after_ms: 0,
            message: 'Demo preparation needs attention before analysis can run.' }
          : { ...base, phase: 'pending', next_action: 'poll_demo', poll_after_ms: 2000 };
      }
      const scope = growthScope(session, demo);
      if (!scope) throw new Error('AE did not confirm the active Demo project and its seven-day sample scope.');
      const file = evidenceFile(scope, session.credential_key);
      let evidence = readGrowthEvidence(store, file, scope);
      const cached = evidence !== undefined
        && deps.now() - evidence.verifiedAt >= 0
        && deps.now() - evidence.verifiedAt < CACHE_TTL_MS;
      let queryMs = 0;
      if (!evidence || !cached) {
        const source = await resolveEventSource(call, scope.projectId);
        const queryStarted = deps.now();
        const rows = await call('analysis.adhoc.run', { project_id: scope.projectId, model_type: 'sql',
          definition: { sql: growthSql(scope, source) }, use_cache: false });
        queryMs = Math.max(0, deps.now() - queryStarted);
        evidence = parseGrowth(rows, scope, deps.now());
      }
      if (deps.credentialKey(host) !== session.credential_key) throw new Error('The active CLI account changed during Demo growth analysis.');
      if (!cached) store.write(file, evidence);
      const readyDemo = { sample_id: scope.sampleId, item_id: scope.itemId, project_id: scope.projectId,
        start_date: scope.startDate, end_date: scope.endDate, zone_offset: scope.zoneOffset };
      if (!Object.entries(readyDemo).every(([key, value]) => session.ready_demo?.[key as keyof ReadyDemoScope] === value)) {
        session.ready_demo = readyDemo;
        store.save(session);
      }
      const singleRate = evidence.single_day.viewers ? evidence.single_day.buyers / evidence.single_day.viewers : null;
      const multiRate = evidence.multi_day.viewers ? evidence.multi_day.buyers / evidence.multi_day.viewers : null;
      const checkoutUnpaid = evidence.checkoutAccountIds.length;
      const checkoutAccounts = new Set(evidence.checkoutAccountIds);
      const overlappingAccounts = evidence.accountIds.filter(id => checkoutAccounts.has(id)).length;
      const funnelSteps = [
        { event: VIEW, accounts: evidence.funnel.viewers },
        { event: CHECKOUT, accounts: evidence.funnel.checkout },
        { event: PAYMENT, accounts: evidence.funnel.buyers },
      ];
      const funnelTransitions = funnelSteps.slice(1).map((step, index) => {
        const previous = funnelSteps[index];
        return { from_event: previous.event, to_event: step.event, from_accounts: previous.accounts, to_accounts: step.accounts,
          dropoff_accounts: previous.accounts - step.accounts, conversion_rate: previous.accounts ? step.accounts / previous.accounts : null };
      });
      const followUpData = scenario === CHECKOUT_RECOVERY ? [
        { label: 'Started checkout', value: evidence.funnel.checkout },
        { label: 'Paid after checkout', value: evidence.funnel.buyers },
        { label: 'Checkout without payment', value: checkoutUnpaid },
      ] : [
        { label: 'Multi-day viewers, unpaid', value: evidence.accountIds.length },
        { label: 'Single-day viewers, unpaid', value: evidence.single_day.viewers - evidence.single_day.buyers },
        { label: 'Paid viewers', value: evidence.single_day.buyers + evidence.multi_day.buyers },
      ];
      const maxCount = Math.max(1, ...followUpData.map(row => row.value));
      const followUpMarkdown = followUpData.map(({ label, value }) => {
        const width = value === 0 ? 0 : Math.max(1, Math.round(value * 10 / maxCount));
        return `- ${label} · ${width ? '█'.repeat(width) + ' ' : ''}**${value}**`;
      }).join('\n');
      const checkoutTotal = evidence.funnel.checkout;
      const checkoutOther = checkoutTotal - checkoutUnpaid;
      const checkoutShare = [
        { label: 'Started checkout without paying', value: checkoutUnpaid },
        { label: checkoutOther === evidence.funnel.buyers ? 'Paid after checkout' : 'Other checkout starters', value: checkoutOther },
      ] as const;
      const audienceOverlap = [
        { label: 'Both signals', value: overlappingAccounts },
        { label: 'Started checkout only', value: checkoutUnpaid - overlappingAccounts },
        { label: 'Viewed on multiple days only', value: evidence.accountIds.length - overlappingAccounts },
      ] as const;
      const purchaseRateData = [
        ...(singleRate === null ? [] : [{ label: 'Single-day viewers', value: Math.round(singleRate * 1000) / 10 }]),
        ...(multiRate === null ? [] : [{ label: 'Multi-day viewers', value: Math.round(multiRate * 1000) / 10 }]),
      ];
      const funnelData = [
        { label: 'Viewed', value: evidence.funnel.viewers },
        { label: 'Started checkout', value: checkoutTotal },
        { label: 'Paid', value: evidence.funnel.buyers },
      ];
      const dailyViewers = evidence.dailyViewers;
      const dailyData = dailyViewers && sampleDates(scope.startDate).map((label, index) => ({ label, value: dailyViewers[index] }));

      return { ...base, phase: 'ready', demo_project_id: scope.projectId, item_id: scope.itemId,
        start_date: scope.startDate, end_date: scope.endDate, zone_offset: scope.zoneOffset, analysis_version: GROWTH_VERSION,
        single_day: evidence.single_day, multi_day: evidence.multi_day, funnel: evidence.funnel,
        purchase_rates: { single_day: singleRate, multi_day: multiRate,
          difference_pp: singleRate === null || multiRate === null ? null : (multiRate - singleRate) * 100 },
        data_basis: { source: 'demo_seed_events', counting_unit: 'distinct_accounts', funnel_transitions: funnelTransitions },
        charts: {
          purchase_rate: { type: 'bar', data: purchaseRateData },
          funnel: { type: 'bar', data: funnelData },
          ...(dailyData ? { daily_viewers: { type: 'line', data: dailyData } } : {}),
        },
        visuals: {
          overview: scope.sampleId === 'season-pass' ? 'checkout_share' : 'purchase_rate',
          checkout_share: checkoutTotal > 0 ? { type: 'pie', data: checkoutShare } : null,
          audience_overlap: { type: 'pie', data: audienceOverlap },
        },
        markdown_charts: {
          purchase_rate: comparisonMarkdown([
            { label: 'Single-day viewers', value: singleRate === null ? null : singleRate * 100 },
            { label: 'Multi-day viewers', value: multiRate === null ? null : multiRate * 100 },
          ], 100, true),
          checkout_share: checkoutShareMarkdown(checkoutShare),
          audience_overlap: audienceShareMarkdown(audienceOverlap),
          purchase_funnel: purchasePathMarkdown(funnelData, funnelTransitions),
          follow_up: comparisonMarkdown(followUpData, maxCount),
          ...(dailyData ? { daily_viewers: dailyViewerChangesMarkdown(dailyData) } : {}),
        },
        follow_up_chart: { type: 'bar', data: followUpData, markdown: followUpMarkdown },
        follow_up_count: scenario === CHECKOUT_RECOVERY ? checkoutUnpaid : evidence.accountIds.length,
        checkout_recovery: { unpaid_count: checkoutUnpaid, unpaid_rate: evidence.funnel.checkout ? checkoutUnpaid / evidence.funnel.checkout : null },
        candidate_cohorts: { multi_day_unpaid: evidence.accountIds.length, checkout_unpaid: checkoutUnpaid,
          overlap: overlappingAccounts, total_distinct: evidence.accountIds.length + checkoutUnpaid - overlappingAccounts },
        cohort_path: path.resolve(store.directory, file),
        evidence: onboardingEvidenceLinks(demo.evidence, scope.projectId, deps.webConversation ? undefined : host),
        interaction: onboardingInteraction(scenario === CHECKOUT_RECOVERY && checkoutUnpaid < 2 ? 'offer_growth_questions' : 'growth_ready'),
        cached, query_ms: queryMs, elapsed_ms: Math.max(0, deps.now() - started), poll_after_ms: 0 };
    } catch (error) {
      if (signal.aborted || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))) {
        return { ...base, phase: 'pending', next_action: 'retry_growth', poll_after_ms: 2000 };
      }
      throw error;
    }
  });
}
