// Regression suite for the ae-migrate-tracking-code skill.
//
// Levels:
//   L1 — offline Phase 0–3: golden scan.json / mapping.json / draft.json are
//        schema-conformant, internally consistent with the fixture code, and the
//        draft.json passes `ae-cli tracking plan validate` + `draft` (xlsx) offline.
//   L2 — Phase 4 code generation: golden migrated code carries the correct AE SDK
//        import (from the bundled wiki), a `// @tracking <event>` marker per event,
//        and the right add/switch behavior (source calls kept vs removed). Syntax is
//        checked with `node --check`.
//
// The suite is data-driven: each provider adds a `fixtures/<provider>/<platform>/`
// source project and a `golden/<provider>/<platform>/` artifact set. No test code
// changes are needed to add a platform — only the PLATFORM_META row below (AE
// package name + module type).
//
// Run: npm run verify:skill-migration

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, copyFile, readdir, mkdtemp, rm, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SUITE = __dirname;
const FIXTURES = path.join(SUITE, 'fixtures');
const GOLDEN = path.join(SUITE, 'golden');
const SKILL_DIR = path.join(ROOT, 'skills', 'ae-migrate-tracking-code');

const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/;
const VALID_PROP_TYPES = new Set(['string', 'number', 'bool', 'datetime', 'object', 'array_row', 'array_string']);
const VALID_UPDATE_TYPES = new Set(['user_set', 'user_setOnce', 'user_add']);
const USER_PROP_CALLS = new Set(['user_set', 'user_setOnce', 'user_add', 'user_append', 'user_unset']);
const SUPER_PROP_CALLS = new Set(['set_super_properties']);
const VALID_SOURCES = new Set(['template', 'prd', 'chat', 'codebase', 'website', 'autotrack', 'business_dimension', 'data']);

// Per-platform metadata used only for L1/L2 assertions. Everything else is derived from
// the fixtures + golden artifacts themselves.
//   aePackage  — AE SDK package/import string that must appear in the migrated code
//   fileExt    — extension of the single migrated code file under golden/<platform>/migrated/
//   syntax     — 'esm' | 'cjs' (run `node --check`) or null (non-JS, skip syntax check)
//   variant    — the scan.json/mapping.json `variant` value (the SDK variant token, NOT
//                the fixture directory name — e.g. `mixpanel/browser` → `javascript`)
const PLATFORM_META = {
  'amplitude/browser-2.x': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'browser-2.x' },
  'amplitude/node': { aePackage: 'thinkingdata-node', fileExt: '.js', syntax: 'cjs', variant: 'node' },
  'amplitude/realworld': { aePackage: 'thinkingdata-node', fileExt: '.js', syntax: 'cjs', variant: 'node' },
  'firebase/web-v9': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'web-v9' },
  'firebase/web-v9-guarded': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'web-v9' },
  'firebase/web-v8': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'web-v8' },
  'firebase/naming': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'web-v9' },
  'firebase/realworld': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'web-v9' },
  'firebase/android': { aePackage: 'cn.thinkingdata.android', fileExt: '.kt', syntax: null, variant: 'android' },
  'sensors-data/web': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'web' },
  'sensors-data/java': { aePackage: 'cn.thinkingdata', fileExt: '.java', syntax: null, variant: 'java' },
  'mixpanel/browser': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'javascript' },
  'mixpanel/naming': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'javascript' },
  'mixpanel/realworld': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'javascript' },
  'mixpanel/mixed': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'javascript' },
  'mixpanel/wrapper': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'javascript' },
  'mixpanel/superprops': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'javascript' },
  'mixpanel/node': { aePackage: 'thinkingdata-node', fileExt: '.js', syntax: 'cjs', variant: 'node' },
  'ga4/gtag-web': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'gtag-web' },
  'ga4/mp-server': { aePackage: 'thinkingdata-node', fileExt: '.js', syntax: 'cjs', variant: 'mp-server' },
  'firebase/react-native': { aePackage: 'react-native-thinking-data', fileExt: '.js', syntax: 'esm', variant: 'react-native' },
  'sensors-data/android': { aePackage: 'cn.thinkingdata.android', fileExt: '.kt', syntax: null, variant: 'android' },
  'mixpanel/ios': { aePackage: 'ThinkingSDK', fileExt: '.swift', syntax: null, variant: 'ios' },
  'ga4/datalayer': { aePackage: 'thinkingdata-browser', fileExt: '.js', syntax: 'esm', variant: 'datalayer' },
};

async function loadJson(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

async function listDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Run `ae-cli ...` via the in-repo tsx entrypoint. Never throws on non-zero exit. */
function runCli(args, { timeout = 60000 } = {}) {
  return new Promise((resolve) => {
    execFile('npx', ['tsx', 'src/index.ts', ...args], { cwd: ROOT, timeout }, (err, stdout, stderr) => {
      resolve({ code: err && typeof err.code === 'number' ? err.code : err ? 1 : 0, stdout, stderr });
    });
  });
}

/** Syntax-check a JS file with `node --check` (ESM → .mjs copy, CJS → .js copy). */
async function checkSyntax(filePath, syntax) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ae-migrate-syntax-'));
  try {
    const target = path.join(dir, syntax === 'esm' ? 'check.mjs' : 'check.js');
    await copyFile(filePath, target);
    await execFileAsync(process.execPath, ['--check', target]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Dual-write independence (generic, every provider): files that still call the source
// SDK must keep the two SDKs independent. Each AE write sits in its own try/catch — never
// in the same try block as the source call — and each SDK init is guarded, so one SDK
// being unloaded or disabled (init throws, isSupported() === false, or a thrown error)
// never takes the other down.
const AE_WRITE_SOURCE =
  '\\b(?:ta|TDAnalytics|teSDK|te)\\.(?:track|login|userSet|userSetOnce|userAdd|userAppend|userUnset|setSuperProperties)\\s*\\(';
const SDK_INIT_SOURCE =
  '\\b(?:ta\\.init|TDAnalytics\\.init|ThinkingData\\.initWithLoggingMode|new\\s+TDAnalytics' +
  '|amplitude\\.init|Mixpanel\\.init|firebase\\.initializeApp|firebase\\.analytics' +
  '|initializeApp|new\\s+SensorsAnalytics)\\s*\\(';

function assertDualWriteIndependent(code, sourceCalls, label) {
  const problems = [];
  const re = new RegExp(AE_WRITE_SOURCE, 'g');
  let m;
  while ((m = re.exec(code)) !== null) {
    const pos = m.index;
    const tryIdx = code.lastIndexOf('try {', pos);
    if (tryIdx === -1) {
      problems.push(`${label}: AE write at ${pos} not inside any try/catch`);
      continue;
    }
    const depth =
      (code.slice(tryIdx, pos).match(/\{/g) || []).length - (code.slice(tryIdx, pos).match(/\}/g) || []).length;
    if (depth < 1) {
      problems.push(`${label}: AE write at ${pos} not enclosed by its nearest try`);
      continue;
    }
    for (const sc of sourceCalls) {
      const scIdx = code.indexOf(sc);
      if (scIdx !== -1 && scIdx > tryIdx && scIdx < pos) {
        problems.push(`${label}: AE write shares a try block with source call "${sc}"`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
}

function assertSdkInitsGuarded(code, label) {
  const problems = [];
  const re = new RegExp(SDK_INIT_SOURCE, 'g');
  let m;
  while ((m = re.exec(code)) !== null) {
    const pos = m.index;
    const tryIdx = code.lastIndexOf('try {', pos);
    if (tryIdx === -1) {
      problems.push(`${label}: SDK init at ${pos} not inside any try/catch`);
      continue;
    }
    const depth =
      (code.slice(tryIdx, pos).match(/\{/g) || []).length - (code.slice(tryIdx, pos).match(/\}/g) || []).length;
    if (depth < 1) problems.push(`${label}: SDK init at ${pos} not enclosed by its nearest try`);
  }
  assert.deepEqual(problems, [], problems.join('\n'));
}

// Collect every golden platform that has fixture + artifacts.
const providers = await listDirs(GOLDEN);
const platforms = [];
for (const provider of providers) {
  for (const platform of await listDirs(path.join(GOLDEN, provider))) {
    platforms.push(`${provider}/${platform}`);
  }
}

for (const platform of platforms) {
  const [provider, platformName] = platform.split('/');
  const fixtureRoot = path.join(FIXTURES, provider, platformName);
  const goldenRoot = path.join(GOLDEN, provider, platformName);

  const scan = await loadJson(path.join(goldenRoot, 'scan.json'));
  const mapping = await loadJson(path.join(goldenRoot, 'mapping.json'));
  const draft = await loadJson(path.join(goldenRoot, 'draft.json'));

  test(`L1 ${platform}: scan.json is schema-conformant and matches the fixture`, async () => {
    assert.equal(scan.provider, provider, 'scan.provider mismatch');
    const meta = PLATFORM_META[platform];
    if (meta?.variant) assert.equal(scan.variant, meta.variant, 'scan.variant mismatch');
    assert.ok(Array.isArray(scan.call_sites) && scan.call_sites.length > 0, 'scan.call_sites empty');
    for (const cs of scan.call_sites) {
      assert.ok(['event', 'identity', 'user_property', 'super_property'].includes(cs.kind), `bad kind: ${cs.kind}`);
      assert.ok(cs.file && cs.source_call, 'call site missing file/source_call');
      if (cs.kind === 'event') assert.ok(cs.event_name, 'event call site missing event_name');
      if (cs.kind === 'super_property') {
        assert.ok(cs.props && Object.keys(cs.props).length > 0, 'super_property call site missing props');
      }

      // The recorded source_call must literally appear in the fixture file (call-site
      // lines are extracted verbatim).
      const fixtureFile = await readFile(path.join(fixtureRoot, cs.file), 'utf8');
      assert.ok(
        fixtureFile.includes(cs.source_call),
        `source_call not found in fixture ${cs.file}: ${cs.source_call}`,
      );
    }
  });

  test(`L1 ${platform}: mapping.json covers every call site with a valid AE target`, async () => {
    assert.ok(['switch', 'add'].includes(mapping.mode), `bad mode: ${mapping.mode}`);
    assert.equal(mapping.provider, provider, 'mapping.provider mismatch');
    const meta = PLATFORM_META[platform];
    if (meta?.variant) assert.equal(mapping.variant, meta.variant, 'mapping.variant mismatch');

    const eventSites = scan.call_sites.filter((c) => c.kind === 'event');
    const entriesBySite = new Map(mapping.entries.map((e) => [e.site_id, e]));

    for (const cs of scan.call_sites) {
      const entry = entriesBySite.get(cs.id);
      assert.ok(entry, `no mapping entry for site ${cs.id}`);
      assert.ok(['replace', 'add_before', 'add_after'].includes(entry.action), `bad action: ${entry.action}`);
    }
    for (const cs of eventSites) {
      const entry = entriesBySite.get(cs.id);
      assert.ok(entry.ae_event, `event site ${cs.id} missing ae_event`);
      assert.ok(SNAKE_CASE_RE.test(entry.ae_event), `ae_event not snake_case: ${entry.ae_event}`);
      for (const type of Object.values(entry.ae_props ?? {})) {
        assert.ok(VALID_PROP_TYPES.has(type), `bad prop type: ${type}`);
      }
    }
    for (const cs of scan.call_sites.filter((c) => c.kind === 'user_property')) {
      const entry = entriesBySite.get(cs.id);
      // User-property entries must use ae_call + ae_props (name → type map), NOT the
      // scan-side `prop` / `value` / `prop_type` fields — see ir.md §mapping.json.
      assert.ok(USER_PROP_CALLS.has(entry.ae_call), `user_property site ${cs.id} missing valid ae_call`);
      assert.ok(entry.ae_props && Object.keys(entry.ae_props).length > 0, `user_property site ${cs.id} missing ae_props`);
      for (const type of Object.values(entry.ae_props ?? {})) {
        assert.ok(VALID_PROP_TYPES.has(type), `bad prop type: ${type}`);
      }
    }
    for (const cs of scan.call_sites.filter((c) => c.kind === 'super_property')) {
      const entry = entriesBySite.get(cs.id);
      // Super-property entries map to AE common event properties via ae_call
      // `set_super_properties` + ae_props (name → type map) — see ir.md §mapping.json.
      assert.ok(SUPER_PROP_CALLS.has(entry.ae_call), `super_property site ${cs.id} missing valid ae_call`);
      assert.ok(entry.ae_props && Object.keys(entry.ae_props).length > 0, `super_property site ${cs.id} missing ae_props`);
      for (const type of Object.values(entry.ae_props ?? {})) {
        assert.ok(VALID_PROP_TYPES.has(type), `bad prop type: ${type}`);
      }
    }
  });

  test(`L1 ${platform}: draft.json is valid and consistent with mapping.json`, async () => {
    assert.ok(['client_only', 'server_only', 'both', 'none'].includes(draft.meta.sdk_integration_mode), 'bad sdk_integration_mode');
    assert.ok(draft.meta.plan_name, 'plan_name required');

    // source must be a valid AE Source enum value — "migration" is not one.
    const eventPropNames = new Set(draft.event_properties.map((p) => p.name));
    const eventNames = new Set();
    for (const evt of draft.events) {
      assert.ok(SNAKE_CASE_RE.test(evt.event_name), `event not snake_case: ${evt.event_name}`);
      assert.ok(!eventNames.has(evt.event_name), `duplicate event: ${evt.event_name}`);
      eventNames.add(evt.event_name);
      assert.ok(VALID_SOURCES.has(evt.source), `bad event source: ${evt.source}`);
      for (const pn of evt.prop_names) {
        if (pn.startsWith('#')) continue; // SDK preset
        assert.ok(eventPropNames.has(pn), `event ${evt.event_name} references unknown property ${pn}`);
      }
    }
    for (const p of [...draft.event_properties, ...draft.common_event_properties, ...draft.user_properties]) {
      assert.ok(VALID_PROP_TYPES.has(p.type), `bad prop type: ${p.type}`);
      assert.ok(VALID_SOURCES.has(p.source), `bad prop source: ${p.source}`);
    }
    for (const p of draft.user_properties) {
      if (p.update_type) assert.ok(VALID_UPDATE_TYPES.has(p.update_type), `bad update_type: ${p.update_type}`);
    }

    // Every mapped event must land in the draft.
    const mappedEvents = mapping.entries.filter((e) => e.ae_event).map((e) => e.ae_event);
    for (const name of mappedEvents) {
      assert.ok(eventNames.has(name), `mapped event ${name} missing from draft.events`);
    }
  });

  test(`L1 ${platform}: draft.json passes ae-cli tracking plan validate`, async () => {
    const res = await runCli(['tracking', 'plan', 'validate', '--in', path.join(goldenRoot, 'draft.json')]);
    assert.equal(res.code, 0, `validate exited ${res.code}\nstdout: ${res.stdout}\nstderr: ${res.stderr}`);
    assert.ok(res.stdout.length > 0, 'validate produced no output');
  });

  test(`L1 ${platform}: draft.json generates xlsx via ae-cli tracking plan draft`, async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'ae-migrate-draft-'));
    try {
      await copyFile(path.join(goldenRoot, 'draft.json'), path.join(tmp, 'draft.json'));
      const out = path.join(tmp, 'draft.xlsx');
      const res = await runCli(['tracking', 'plan', 'draft', '--in', path.join(tmp, 'draft.json'), '--out', out]);
      assert.equal(res.code, 0, `draft exited ${res.code}\nstdout: ${res.stdout}\nstderr: ${res.stderr}`);
      await access(out);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  test(`L2 ${platform}: migrated code has AE import, @tracking markers, and correct add/switch behavior`, async () => {
    const meta = PLATFORM_META[platform];
    assert.ok(meta, `missing PLATFORM_META for ${platform}`);

    const migratedRoot = path.join(goldenRoot, 'migrated');
    const migratedFiles = (await readdir(migratedRoot)).filter((f) => f.endsWith(meta.fileExt));
    assert.ok(migratedFiles.length > 0, 'no migrated code file found');

    // A platform may migrate more than one source file — assert against the concatenated
    // output so multi-file fixtures are checked in full (source-call removal, @tracking
    // markers and the AE import can live in different files).
    const code = (
      await Promise.all(migratedFiles.map((f) => readFile(path.join(migratedRoot, f), 'utf8')))
    ).join('\n');

    // AE SDK import present.
    assert.ok(code.includes(meta.aePackage), `migrated code missing AE package "${meta.aePackage}"`);

    // Source SDK dependency kept (add) or removed (switch), per the fixture's package.json
    // (non-JS fixtures have no package.json — the source SDK is a Gradle/Maven/etc. dep,
    // asserted instead via source-call removal and the dedicated provider tests below).
    // The dependency is all-or-nothing: removed only on a full cut-over (mode=switch AND
    // every entry replace). A staged/mixed run keeps it — surviving add_* sites still call it.
    const pkgPath = path.join(fixtureRoot, 'package.json');
    if (await exists(pkgPath)) {
      const fixturePkg = await loadJson(pkgPath);
      const sourceDeps = Object.keys(fixturePkg.dependencies ?? {});
      const fullCutover = mapping.mode === 'switch' && mapping.entries.every((e) => e.action === 'replace');
      for (const dep of sourceDeps) {
        if (fullCutover) {
          assert.ok(!code.includes(dep), `full cut-over should remove source dep "${dep}"`);
        } else {
          assert.ok(code.includes(dep), `add/mixed mode should keep source dep "${dep}"`);
        }
      }
    }

    // Source call sites removed (action=replace) or preserved (action=add_after/add_before).
    // Per-entry `action` is authoritative — `mode` is only the run-level default, and a
    // staged/mixed run may diverge per entry.
    const entryBySite = new Map(mapping.entries.map((e) => [e.site_id, e]));
    for (const cs of scan.call_sites) {
      const entry = entryBySite.get(cs.id);
      assert.ok(entry, `no mapping entry for site ${cs.id}`);
      if (entry.action === 'replace') {
        assert.ok(!code.includes(cs.source_call), `replace action should remove source call "${cs.source_call}"`);
      } else {
        assert.ok(code.includes(cs.source_call), `${entry.action} action should preserve source call "${cs.source_call}"`);
      }
    }

    // Every mapped event carries a `// @tracking <event_name>` marker.
    for (const entry of mapping.entries.filter((e) => e.ae_event)) {
      assert.ok(code.includes(`// @tracking ${entry.ae_event}`), `missing "// @tracking ${entry.ae_event}"`);
    }

    // Syntax check (JS only — non-JS fixtures have no in-repo compiler).
    if (meta.syntax) {
      for (const f of migratedFiles) {
        await checkSyntax(path.join(migratedRoot, f), meta.syntax);
      }
    }

    // Dual-write independence (generic, every provider): files that still call the source
    // SDK must keep the two SDKs independent — each write in its own try/catch and each SDK
    // init guarded — so one SDK being unloaded or disabled never takes the other down.
    // Fully-switched files (single SDK, no source calls left) are exempt: there is no second
    // SDK to protect.
    const dualWrite = mapping.mode === 'add' || mapping.entries.some((e) => e.action !== 'replace');
    if (dualWrite) {
      for (const f of migratedFiles) {
        const fileCode = await readFile(path.join(migratedRoot, f), 'utf8');
        const sourceCalls = scan.call_sites
          .map((c) => c.source_call)
          .filter((sc) => fileCode.includes(sc));
        if (sourceCalls.length === 0) continue;
        const label = `${platform}/${f}`;
        assert.ok(
          !/\bif\s*\(\s*![A-Za-z_$][\w$]*\s*\)\s*return\b/.test(fileCode),
          `${label}: source availability early-return guard must not gate AE writes`,
        );
        assertDualWriteIndependent(fileCode, sourceCalls, label);
        assertSdkInitsGuarded(fileCode, label);
      }
    }
  });
}

// Amplitude-pilot specifics: identity + user-property conversions (the subtle parts
// of the adapter's §3/§4 mapping), asserted explicitly for both fixtures.
test('L2 amplitude browser-2.x (switch): identity and Identify ops converted', async () => {
  const code = await readFile(
    path.join(GOLDEN, 'amplitude', 'browser-2.x', 'migrated', 'analytics.js'),
    'utf8',
  );
  assert.ok(code.includes('ta.login(user.id)'), 'setUserId should map to ta.login');
  assert.ok(code.includes('ta.userSet({ plan: "pro" })'), 'identify.set should map to ta.userSet');
  assert.ok(code.includes('ta.userSetOnce({ signup_source: "organic" })'), 'identify.setOnce should map to ta.userSetOnce');
  assert.ok(code.includes('ta.userAdd({ logins: 1 })'), 'identify.add should map to ta.userAdd');
  assert.ok(!code.includes('amplitude.'), 'no source SDK calls may remain in switch mode');
});

test('L2 amplitude node (add): server user_id rides per-event as accountId', async () => {
  const code = await readFile(
    path.join(GOLDEN, 'amplitude', 'node', 'migrated', 'server.js'),
    'utf8',
  );
  assert.ok(code.includes('accountId: user.id'), 'server user_id should map to per-event accountId');
  assert.ok(code.includes("event: 'user_signup'"), 'user_signup should be sent via teSDK.track');
  assert.ok(code.includes("event: 'purchase'"), 'purchase should be sent via teSDK.track');
  assert.ok(code.includes('amplitude.track('), 'add mode must keep the source SDK call');
});

// Firebase (common SDKs: web v9 modular, web v8 namespaced, Android).
test('L2 firebase web-v9 (switch): setUserId/setUserProperties converted', async () => {
  const code = await readFile(path.join(GOLDEN, 'firebase', 'web-v9', 'migrated', 'analytics.js'), 'utf8');
  assert.ok(code.includes('ta.login(user.id)'), 'setUserId should map to ta.login');
  assert.ok(code.includes('ta.userSet({ plan: "pro" })'), 'setUserProperties should map to ta.userSet');
  assert.ok(!code.includes('logEvent('), 'no source logEvent calls may remain in switch mode');
  assert.ok(!code.includes('firebase/analytics'), 'source import must be removed in switch mode');
});

test('L2 firebase web-v8 (add): namespaced calls kept alongside AE', async () => {
  const code = await readFile(path.join(GOLDEN, 'firebase', 'web-v8', 'migrated', 'analytics.js'), 'utf8');
  assert.ok(code.includes("import firebase from 'firebase/app'"), 'add mode must keep the source import');
  assert.ok(code.includes("analytics.logEvent('sign_up'"), 'add mode must keep source logEvent');
  assert.ok(code.includes('ta.login(user.id)'), 'AE login must be added');
  assert.ok(code.includes('ta.track("sign_up"'), 'AE track must be added');
});

test('L2 firebase android (switch): Event constant maps to snake_case, no Firebase import', async () => {
  const code = await readFile(path.join(GOLDEN, 'firebase', 'android', 'migrated', 'AnalyticsTracker.kt'), 'utf8');
  assert.ok(code.includes('import cn.thinkingdata.android.TDAnalytics'), 'AE Android import must be present');
  assert.ok(code.includes('TDAnalytics.login(userId)'), 'setUserId should map to TDAnalytics.login');
  assert.ok(code.includes('TDAnalytics.track("select_content", properties)'), 'SELECT_CONTENT constant should map to select_content');
  assert.ok(code.includes('TDAnalytics.userSet(userProperties)'), 'setUserProperty should map to userSet');
  assert.ok(!code.includes('FirebaseAnalytics'), 'no Firebase import/calls may remain in switch mode');
});

// Independence regression (representative of the generic L2 check above): in `add` mode
// the AE write must not be gated behind the source SDK's availability guard, and each
// SDK — init included — must be guarded independently, so unloading or disabling one SDK
// (isSupported() === false, init throws, or a thrown error) never takes the other down.
test('L2 firebase web-v9-guarded (add): AE writes independent of the source availability guard', async () => {
  const code = await readFile(path.join(GOLDEN, 'firebase', 'web-v9-guarded', 'migrated', 'analytics.js'), 'utf8');
  // Source SDK calls kept (add mode).
  assert.ok(code.includes("logEvent(analytics, 'sign_up', { method: user.method })"), 'source logEvent kept');
  assert.ok(code.includes('setUserId(analytics, userId)'), 'source setUserId kept');
  assert.ok(code.includes("setUserProperties(analytics, { plan: 'pro' })"), 'source setUserProperties kept');
  // AE writes added and unconditional.
  assert.ok(code.includes('ta.track("sign_up"'), 'AE track for sign_up added');
  assert.ok(code.includes('ta.track("view_item"'), 'AE track for view_item added');
  assert.ok(code.includes('ta.login(userId)'), 'AE login added');
  assert.ok(code.includes('ta.userSet({ plan: "pro" })'), 'AE userSet added');
  // Independence: the buggy shape keeps the source's early-return guard
  // (`if (!analytics) return;`) ahead of the AE write, silencing AE whenever Firebase
  // is unavailable. The fixed golden converts it to a positive `if (analytics)` +
  // per-SDK try/catch, so no early return may gate the AE writes.
  assert.ok(!code.includes('if (!analytics) return'), 'source early-return guard must not gate the AE writes');
  // Bidirectional init independence: a Firebase or AE load failure must not crash the
  // module before the other SDK's writes are defined — each init is in its own try/catch.
  assert.ok(/try\s*\{\s*app\s*=\s*initializeApp\(/.test(code), 'Firebase init must be guarded');
  assert.ok(/try\s*\{\s*ta\.init\(/.test(code), 'AE init must be guarded');
});

// Sensors Data (神策) — common SDKs: web JS, Java server.
test('L2 sensors-data web (switch): login + profileSet converted', async () => {
  const code = await readFile(path.join(GOLDEN, 'sensors-data', 'web', 'migrated', 'analytics.js'), 'utf8');
  assert.ok(code.includes('ta.login(user.id)'), 'sensors.login should map to ta.login');
  assert.ok(code.includes('ta.userSet({ plan: "pro" })'), 'profileSet should map to ta.userSet');
  assert.ok(!code.includes('sensors.'), 'no source sensors calls may remain in switch mode');
});

test('L2 sensors-data java (add): server track added alongside source', async () => {
  const code = await readFile(path.join(GOLDEN, 'sensors-data', 'java', 'migrated', 'AnalyticsService.java'), 'utf8');
  assert.ok(code.includes('import cn.thinkingdata.java.TDAnalytics;'), 'AE Java import must be present');
  assert.ok(code.includes('sa.track(userId, true, "user_signup", props)'), 'add mode must keep source track');
  assert.ok(code.includes('te.track(userId, null, "user_signup", props)'), 'AE track must be added with accountId');
  assert.ok(code.includes('// @tracking purchase'), 'purchase marker must be present');
});

// Mixpanel — common SDKs: browser, node.
test('L2 mixpanel browser (switch): identify + people.set converted', async () => {
  const code = await readFile(path.join(GOLDEN, 'mixpanel', 'browser', 'migrated', 'analytics.js'), 'utf8');
  assert.ok(code.includes('ta.login(user.id)'), 'identify should map to ta.login');
  assert.ok(code.includes('ta.userSet({ plan: "pro" })'), 'people.set should map to ta.userSet');
  assert.ok(!code.includes('mixpanel.'), 'no source mixpanel calls may remain in switch mode');
});

test('L2 mixpanel node (add): distinct_id rides as accountId', async () => {
  const code = await readFile(path.join(GOLDEN, 'mixpanel', 'node', 'migrated', 'server.js'), 'utf8');
  assert.ok(code.includes("mixpanel.track('user_signup'"), 'add mode must keep source track');
  assert.ok(code.includes("accountId: user.id"), 'distinct_id should map to per-event accountId');
  assert.ok(code.includes("event: 'user_signup'"), 'user_signup should be sent via teSDK.track');
});

test('L2 mixpanel mixed (switch + staged add_after): per-entry action, source dep kept', async () => {
  const app = await readFile(path.join(GOLDEN, 'mixpanel', 'mixed', 'migrated', 'app.js'), 'utf8');
  const payment = await readFile(path.join(GOLDEN, 'mixpanel', 'mixed', 'migrated', 'payment.js'), 'utf8');
  // Run-level mode is `switch`, but the purchase entry stays `add_after` (staged roll-out):
  // identity + sign_up are cut over; purchase keeps dual-writing and the source SDK survives.
  assert.ok(app.includes('ta.login(user.id)'), 'identify (replace) should map to ta.login');
  assert.ok(app.includes('ta.track("sign_up"'), 'sign_up (replace) should map to ta.track');
  assert.ok(!app.includes('mixpanel.'), 'fully replaced app.js must drop the source SDK');
  assert.ok(payment.includes("import mixpanel from 'mixpanel-browser'"), 'staged file must keep the source import');
  assert.ok(payment.includes("mixpanel.track(EVENT_PURCHASE"), 'add_after entry must keep the source call');
  assert.ok(payment.includes('ta.track("purchase"'), 'add_after entry must add the AE call');
  assert.ok(payment.includes("import { EVENT_PURCHASE } from './constants.js'"), 'staged file keeps the event-name constant');
  // The source dependency survives because this is not a full cut-over (one entry is add_after).
  assert.ok(app.includes('ta.track(') && payment.includes('ta.track('), 'both files must emit AE tracks');
});

test('L2 mixpanel wrapper (switch): wrapper layer resolved, business calls migrated, wrapper removed', async () => {
  const migratedDir = await readdir(path.join(GOLDEN, 'mixpanel', 'wrapper', 'migrated'));
  assert.ok(!migratedDir.includes('analytics.js'), 'dead wrapper file must be removed in switch mode');

  const app = await readFile(path.join(GOLDEN, 'mixpanel', 'wrapper', 'migrated', 'app.js'), 'utf8');
  const checkout = await readFile(path.join(GOLDEN, 'mixpanel', 'wrapper', 'migrated', 'checkout.js'), 'utf8');
  const code = `${app}\n${checkout}`;

  // Business call sites resolved through the wrapper become AE tracks at the caller site.
  assert.ok(app.includes('ta.track("sign_up"'), 'sign_up should map to ta.track at the business call site');
  assert.ok(checkout.includes('ta.track("purchase"'), 'purchase should map to ta.track at the business call site');
  // The wrapper call itself is gone from both business files.
  assert.ok(!app.includes('trackEvent('), 'wrapper call must be replaced in app.js');
  assert.ok(!checkout.includes('trackEvent('), 'wrapper call must be replaced in checkout.js');
  // Source SDK fully removed.
  assert.ok(!code.includes('mixpanel.'), 'no source mixpanel calls may remain in switch mode');
  assert.ok(!code.includes('mixpanel-browser'), 'source import must be removed in switch mode');
});

test('L2 mixpanel superprops (switch): register → setSuperProperties in place, common props land in draft', async () => {
  const code = await readFile(path.join(GOLDEN, 'mixpanel', 'superprops', 'migrated', 'analytics.js'), 'utf8');
  // register({...}) maps to one AE setSuperProperties({...}) at the original call site.
  assert.ok(code.includes('ta.setSuperProperties({ app_version: "1.2.3", channel: "web" })'), 'register should map to ta.setSuperProperties');
  assert.ok(code.includes('ta.track("sign_up"'), 'sign_up should map to ta.track');
  assert.ok(code.includes('ta.userSet({ plan: "pro" })'), 'people.set should map to ta.userSet');
  assert.ok(!code.includes('mixpanel.'), 'no source mixpanel calls may remain in switch mode');
});

// GA4 — common SDKs: gtag.js (web), Measurement Protocol (server).
test('L2 ga4 gtag-web (switch): gtag set user_id + events converted', async () => {
  const code = await readFile(path.join(GOLDEN, 'ga4', 'gtag-web', 'migrated', 'analytics.js'), 'utf8');
  assert.ok(code.includes('ta.login(user.id)'), "gtag('set','user_id') should map to ta.login");
  assert.ok(code.includes('ta.track("sign_up"'), 'gtag event sign_up should map to ta.track');
  assert.ok(!code.includes('gtag('), 'no gtag calls may remain in switch mode');
});

test('L2 ga4 mp-server (add): Measurement Protocol kept, AE server SDK added', async () => {
  const code = await readFile(path.join(GOLDEN, 'ga4', 'mp-server', 'migrated', 'server.js'), 'utf8');
  assert.ok(code.includes('mp/collect'), 'add mode must keep the Measurement Protocol endpoint');
  assert.ok(code.includes("accountId: user.id"), 'MP user_id should map to per-event accountId');
  assert.ok(code.includes("event: 'user_signup'"), 'user_signup should be sent via teSDK.track');
});

// Deeper variants — one more common SDK shape per provider.
test('L2 firebase react-native (add): logEvent → TDAnalytics.track object form, setUserId → login', async () => {
  const code = await readFile(path.join(GOLDEN, 'firebase', 'react-native', 'migrated', 'analytics.js'), 'utf8');
  assert.ok(code.includes('import TDAnalytics from "react-native-thinking-data"'), 'AE RN import must be present');
  assert.ok(code.includes('TDAnalytics.login(user.id)'), 'setUserId should map to TDAnalytics.login');
  assert.ok(code.includes('TDAnalytics.track({ eventName: "sign_up"'), 'logEvent should map to TDAnalytics.track({eventName,...})');
  assert.ok(code.includes("await analytics().logEvent('sign_up'"), 'add mode must keep source logEvent');
});

test('L2 sensors-data android (switch): SensorsDataAPI → TDAnalytics, profileSet → userSet', async () => {
  const code = await readFile(path.join(GOLDEN, 'sensors-data', 'android', 'migrated', 'AnalyticsHelper.kt'), 'utf8');
  assert.ok(code.includes('import cn.thinkingdata.android.TDAnalytics'), 'AE Android import must be present');
  assert.ok(code.includes('TDAnalytics.login(userId)'), 'sa.login should map to TDAnalytics.login');
  assert.ok(code.includes('TDAnalytics.track("view_item", properties)'), 'sa.track should map to TDAnalytics.track');
  assert.ok(code.includes('TDAnalytics.userSet(userProperties)'), 'profileSet should map to userSet');
  assert.ok(!code.includes('SensorsDataAPI'), 'no SensorsDataAPI import/calls may remain in switch mode');
});

test('L2 mixpanel ios (switch): mainInstance track/identify/people → TDAnalytics', async () => {
  const code = await readFile(path.join(GOLDEN, 'mixpanel', 'ios', 'migrated', 'AnalyticsManager.swift'), 'utf8');
  assert.ok(code.includes('import ThinkingSDK'), 'AE iOS import must be present');
  assert.ok(code.includes('TDAnalytics.login(userId)'), 'identify should map to TDAnalytics.login');
  assert.ok(code.includes('TDAnalytics.track("view_item", properties: properties)'), 'track should map to TDAnalytics.track');
  assert.ok(code.includes('TDAnalytics.userSet(["plan": plan])'), 'people.set should map to TDAnalytics.userSet');
  assert.ok(!code.includes('Mixpanel'), 'no Mixpanel import/calls may remain in switch mode');
});

test('L2 ga4 datalayer (add): dataLayer.push kept, ta.track added', async () => {
  const code = await readFile(path.join(GOLDEN, 'ga4', 'datalayer', 'migrated', 'analytics.js'), 'utf8');
  assert.ok(code.includes("window.dataLayer.push({ event: 'sign_up'"), 'add mode must keep dataLayer.push');
  assert.ok(code.includes('ta.track("sign_up"'), 'AE track must be added');
  assert.ok(code.includes('ta.login(user.id)'), 'user_id push should map to ta.login');
});

// Naming-conversion coverage: the main path of mapping-framework.md §1 (camelCase /
// PascalCase boundaries → underscore, hyphen → underscore, digit-leading `e_` prefix,
// reserved-prefix stripping). Previously 0-covered — every fixture event name was
// already snake_case.
test('L2 firebase naming (switch): camelCase + reserved-prefix strip', async () => {
  const code = await readFile(path.join(GOLDEN, 'firebase', 'naming', 'migrated', 'analytics.js'), 'utf8');
  assert.ok(code.includes('ta.track("user_login"'), 'camelCase userLogin should map to user_login');
  assert.ok(code.includes('ta.track("share"'), 'firebase_ prefix should be stripped (firebase_share → share)');
  assert.ok(code.includes('ta.userSet({ user_role: "admin" })'), 'firebase_ user prop prefix should be stripped');
  assert.ok(code.includes('ta.userSet({ plan: "pro" })'), 'ga_ user prop prefix should be stripped');
  assert.ok(code.includes('ta.userSet({ sign_in_method: "email" })'), 'google_ user prop prefix should be stripped');
  assert.ok(!code.includes('logEvent('), 'no source logEvent calls may remain in switch mode');
  assert.ok(!code.includes('firebase/analytics'), 'source import must be removed in switch mode');
});

test('L2 mixpanel naming (switch): camelCase/PascalCase/hyphen/digit-leading/mp_ prefix', async () => {
  const code = await readFile(path.join(GOLDEN, 'mixpanel', 'naming', 'migrated', 'analytics.js'), 'utf8');
  assert.ok(code.includes('ta.track("user_login", { user_id: "u-1", plan_type: "pro" })'), 'camelCase event + props should map to snake_case');
  assert.ok(code.includes('ta.track("select_content", { content_id: "c-1" })'), 'PascalCase SelectContent should map to select_content');
  assert.ok(code.includes('ta.track("product_view"'), 'hyphen product-view should map to product_view');
  assert.ok(code.includes('ta.track("e_2fa_completed"'), 'digit-leading 2fa_completed should get e_ prefix');
  assert.ok(code.includes('ta.track("subscription"'), 'mp_ prefix should be stripped (mp_subscription → subscription)');
  assert.ok(!code.includes('mixpanel.'), 'no source mixpanel calls may remain in switch mode');
});

// Scaffold regression: every registered provider adapter must keep the 7-section
// contract, and the SKILL.md registry must list each adapter. This is what makes the
// suite extensible to the other four platforms.
test('adapter contract: all 5 providers keep the 7-section structure and are registered', async () => {
  const registry = await readFile(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
  const providerNames = ['firebase', 'amplitude', 'sensors-data', 'mixpanel', 'ga4'];
  for (const name of providerNames) {
    assert.ok(registry.includes(`references/providers/${name}.md`), `SKILL.md registry missing ${name}`);
  }
  const sectionHeads = ['Recognition', 'Event mapping', 'Identity mapping', 'User property mapping', 'Auto-track decision', 'Dependency identifiers', 'Official docs'];
  for (const name of providerNames) {
    const adapter = await readFile(path.join(SKILL_DIR, 'references', 'providers', `${name}.md`), 'utf8');
    for (const head of sectionHeads) {
      assert.ok(adapter.includes(head), `adapter ${name}.md missing section "${head}"`);
    }
  }
});
