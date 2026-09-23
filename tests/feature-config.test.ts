import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const previousHome = process.env.HOME;
const previousSandbox = process.env.SANDBOX_RUNTIME_ROOT;
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-feature-config-'));
process.env.HOME = testHome;

const { rememberKbAutoDiscoveryFeature, peekKbAutoDiscoveryFeature, resolveKbAutoDiscoveryFeature } = await import('../src/core/feature-config.ts');
const { runFeatureConfigCheck } = await import('../src/core/feature-config-check.ts');
const { setCliTokenManual, clearCliToken } = await import('../src/core/cli-token.ts');
const { Command } = await import('commander');
const { registerConfig } = await import('../src/commands/config.ts');

try {
  let fetches = 0;
  const remote = async () => {
    fetches += 1;
    return { projectSemanticKbAutoDiscovery: true };
  };
  assert.deepEqual(
    await resolveKbAutoDiscoveryFeature('https://example.test', 'cli_one', remote),
    { enabled: true, source: 'remote' },
  );
  assert.deepEqual(
    await resolveKbAutoDiscoveryFeature('https://example.test', 'cli_one', remote),
    { enabled: true, source: 'cache' },
  );
  assert.equal(fetches, 1);
  assert.equal(peekKbAutoDiscoveryFeature('https://example.test', 'cli_one'), true);
  assert.equal(peekKbAutoDiscoveryFeature('https://example.test', 'unknown_token'), undefined);

  await resolveKbAutoDiscoveryFeature('https://example.test', 'cli_two', remote);
  await resolveKbAutoDiscoveryFeature('https://other.test', 'cli_one', remote);
  assert.equal(fetches, 3, 'host and CLI identity must not share feature state');

  rememberKbAutoDiscoveryFeature('https://prefetched.test', 'cli_one', false);
  assert.deepEqual(
    await resolveKbAutoDiscoveryFeature('https://prefetched.test', 'cli_one', remote),
    { enabled: false, source: 'cache' },
  );
  assert.equal(fetches, 3, 'compatibility checks must be able to share the config response');
  assert.equal(peekKbAutoDiscoveryFeature('https://prefetched.test', 'cli_one'), false);

  assert.deepEqual(
    await resolveKbAutoDiscoveryFeature('https://unavailable.test', 'cli_one', async () => null),
    { enabled: false, source: 'unavailable' },
  );
  assert.equal(peekKbAutoDiscoveryFeature('https://unavailable.test', 'cli_one'), undefined);
  assert.deepEqual(
    await resolveKbAutoDiscoveryFeature('https://old-server.test', 'cli_one', async () => ({})),
    { enabled: false, source: 'remote' },
  );

  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  try {
    await resolveKbAutoDiscoveryFeature('https://expiry.test', 'cli_one', remote);
    const beforeExpiry = fetches;
    now += 24 * 60 * 60 * 1000;
    assert.equal(peekKbAutoDiscoveryFeature('https://expiry.test', 'cli_one'), undefined);
    await resolveKbAutoDiscoveryFeature('https://expiry.test', 'cli_one', remote);
    assert.equal(fetches, beforeExpiry + 1, 'feature configuration must refresh after 24 hours');
  } finally {
    Date.now = originalNow;
  }

  const file = path.join(testHome, '.ae-cli', 'feature-config.json');
  const cacheText = fs.readFileSync(file, 'utf8');
  assert.equal(cacheText.includes('cli_one'), false);
  assert.equal(cacheText.includes('cli_two'), false);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);

  const featureHost = 'https://features.test';
  const featureToken = 'cli_features';
  setCliTokenManual(featureToken, featureHost);
  const originalFeatureFetch = globalThis.fetch;
  const originalWrite = process.stdout.write;
  let configCalls = 0;
  let output = '';
  globalThis.fetch = (async (request) => {
    if (String(request).includes('/v1/ta/cli/config')) {
      configCalls += 1;
      return new Response(JSON.stringify({
        data: {
          versions: { clusterVersion: '6.1', aeCliVersion: '6.1.24' },
          features: { projectSemanticKbAutoDiscovery: true },
        },
      }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  process.stdout.write = ((chunk: string) => {
    output += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    const program = new Command();
    program.option('--host <url>');
    program.option('--format <format>', '', 'json');
    registerConfig(program);
    await program.parseAsync(['--host', featureHost, 'config', 'show'], { from: 'user' });
    assert.deepEqual(JSON.parse(output).data, {
      host: featureHost,
      routing: { knowledge_base: 'auto' },
      source: 'remote',
    });
    output = '';
    await program.parseAsync(['--host', featureHost, 'config', 'show'], { from: 'user' });
    assert.deepEqual(JSON.parse(output).data, {
      host: featureHost,
      routing: { knowledge_base: 'auto' },
      source: 'cache',
    });
    assert.equal(configCalls, 1, 'repeated config reads must reuse the daily company config cache');
    rememberKbAutoDiscoveryFeature(featureHost, featureToken, false);
    output = '';
    await program.parseAsync(['--host', featureHost, 'config', 'show'], { from: 'user' });
    assert.deepEqual(JSON.parse(output).data, {
      host: featureHost,
      routing: { knowledge_base: 'explicit' },
      source: 'cache',
    });
    assert.equal(configCalls, 1);
  } finally {
    process.stdout.write = originalWrite;
    globalThis.fetch = originalFeatureFetch;
    clearCliToken(featureHost);
  }

  const sandboxRoot = path.join(testHome, 'sandbox');
  fs.mkdirSync(path.join(sandboxRoot, '.ae-config'), { recursive: true });
  fs.writeFileSync(path.join(sandboxRoot, '.ae-config', 'cli-token.json'), JSON.stringify({
    url: 'https://sandbox.test', token: 'cli_sandbox',
  }));
  process.env.SANDBOX_RUNTIME_ROOT = sandboxRoot;
  const originalFetch = globalThis.fetch;
  let sandboxFetches = 0;
  globalThis.fetch = (async () => {
    sandboxFetches += 1;
    return new Response(JSON.stringify({
      data: {
        versions: { clusterVersion: '6.1', aeCliVersion: '6.1.24' },
        features: { projectSemanticKbAutoDiscovery: true },
      },
    }), { status: 200 });
  }) as typeof fetch;
  try {
    assert.deepEqual(await runFeatureConfigCheck(undefined, ['node', 'ae-cli', 'analysis', 'report', 'list']),
      { enabled: true, source: 'remote' });
    assert.deepEqual(await runFeatureConfigCheck(undefined, ['node', 'ae-cli', 'analysis', 'report', 'list']),
      { enabled: true, source: 'cache' });
    assert.equal(sandboxFetches, 1, 'sandbox runtime must refresh config once and reuse its daily cache');
  } finally {
    globalThis.fetch = originalFetch;
  }
} finally {
  if (previousHome === undefined) delete process.env.HOME;
  else process.env.HOME = previousHome;
  if (previousSandbox === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
  else process.env.SANDBOX_RUNTIME_ROOT = previousSandbox;
  fs.rmSync(testHome, { recursive: true, force: true });
}

process.stdout.write('feature config tests: passed\n');
