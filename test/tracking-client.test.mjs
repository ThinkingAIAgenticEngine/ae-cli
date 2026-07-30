import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TrackingClient } from '../src/core/tracking-client.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

function test(name, fn) {
  fn();
  console.log(`  OK: ${name}`);
}

async function testAsync(name, fn) {
  await fn();
  console.log(`  OK: ${name}`);
}

console.log('tracking-client source tests');

test('tracking-client does not read or write AE user locale config', () => {
  const src = readFileSync(path.join(ROOT, 'src/core/tracking-client.ts'), 'utf8');
  assert.doesNotMatch(src, /getUserAutoConfig/);
  assert.doesNotMatch(src, /saveUserAutoConfig/);
  assert.doesNotMatch(src, /getServerLang/);
  assert.doesNotMatch(src, /auto\/config/);
  assert.doesNotMatch(src, /readUmilocal|writeUmilocale|localStorage/);
});

test('tracking-client uses track program capabilities instead of direct program APIs', () => {
  const src = readFileSync(path.join(ROOT, 'src/core/tracking-client.ts'), 'utf8');
  assert.match(src, /executeCapability/);
  assert.match(src, /uploadInputFileBytes/);
  assert.match(src, /TRACK_LOCAL_HOST = 'http:\/\/localhost:8992'/);
  assert.match(src, /new TrackingClient\(host \|\| TRACK_LOCAL_HOST\)/);
  assert.match(src, /track\.program\.query/);
  assert.match(src, /track\.program\.delete/);
  assert.match(src, /track\.program\.excel_save/);
  assert.match(src, /track\.program\.xlsx/);
  assert.match(src, /lang\?: string/);
  assert.match(src, /\.\.\.\(args\.lang \? \{ lang: args\.lang \} : \{\}\)/);
  assert.doesNotMatch(src, /\/v1\/ta\/bury\/manage\/program\/query/);
  assert.doesNotMatch(src, /\/v1\/ta\/bury\/manage\/program\/delete/);
  assert.doesNotMatch(src, /\/v1\/ta\/bury\/manage\/program\/excel-save/);
  assert.doesNotMatch(src, /getToken/);
  assert.doesNotMatch(src, /access_token/);
  assert.doesNotMatch(src, /bearer/);
});

await testAsync('deleteProgram routes public hosts through the analysis capability gateway', async () => {
  const host = 'https://example.thinkingdata.cn';
  const previousFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({ ok: true, data: { status: 'deleted' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  setCliTokenManual('test-cli-token', host);

  try {
    await new TrackingClient(host, 'test-cli-token').deleteProgram(1);
  } finally {
    globalThis.fetch = previousFetch;
    clearCliToken(host);
  }

  assert.equal(
    requestedUrl,
    `${host}/api/cli/analysis/v1/capabilities/track.program.delete/execute`,
  );
});

test('capability input-file upload uses cli-token auth', () => {
  const src = readFileSync(path.join(ROOT, 'src/core/capability-api.ts'), 'utf8');
  assert.match(src, /uploadInputFileBytes/);
  assert.match(src, /getCliToken/);
  assert.match(src, /'cli-token'/);
});

test('tracking plan import exposes local XLSX upload orchestration', () => {
  const src = readFileSync(path.join(ROOT, 'src/commands/te-analysis/tracking/plan/import-excel.ts'), 'utf8');
  assert.match(src, /name: 'input-file'/);
  assert.match(src, /track\.program\.xlsx/);
  assert.match(src, /uploadInputFile/);
  assert.match(src, /tracking plan list-templates --json/);
  assert.match(src, /Pass exactly one of --input-file or --input-file-id/);
  assert.doesNotMatch(src, /const GATEWAY_DOMAIN = resolveGatewayDomain/);
});

test('tracking template discovery exposes an importable XLSX path', () => {
  const src = readFileSync(path.join(ROOT, 'src/tracking/templates.ts'), 'utf8');
  assert.match(src, /xlsxPath: string/);
  assert.match(src, /xlsxPath,/);
  assert.match(src, /mdPath\?: string/);
});

test('plan upload uses local AE_LANG language resolution only', () => {
  const src = readFileSync(path.join(ROOT, 'src/commands/tracking/plan.ts'), 'utf8');
  assert.match(src, /detectCliLocale/);
  assert.match(src, /draft\.meta\.lang/);
  assert.match(src, /lang: locale/);
  assert.doesNotMatch(src, /getServerLang|saveUserAutoConfig|cliLocaleToAE/);
  assert.doesNotMatch(src, /readUmilocal|writeUmilocale|setAELang|auto\/config/);
});

test('paths use .ae-cli project dir', () => {
  const src = readFileSync(path.join(ROOT, 'src/tracking/paths.ts'), 'utf8');
  assert.match(src, /\.ae-cli/);
});

test('shared exports path validation helpers', () => {
  const src = readFileSync(path.join(ROOT, 'src/commands/tracking/shared.ts'), 'utf8');
  assert.match(src, /assertOutputFilePath/);
  assert.match(src, /assertInputFilePath/);
});

test('active host resolution prefers sandbox cli-token host over stale config', () => {
  const src = readFileSync(path.join(ROOT, 'src/core/config.ts'), 'utf8');
  assert.match(src, /const sandboxHost = readSandboxCliTokenEntry\(\)\?\.url/);
  assert.match(src, /if \(sandboxHost\) return sandboxHost/);
  assert.match(src, /return config\.activeHost \|\| ''/);
});

console.log('All tracking-client source tests passed.');
