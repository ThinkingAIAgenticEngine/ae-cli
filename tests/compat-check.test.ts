import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isCompatCacheStale,
  shouldNotifyCompat,
  shouldSkipAutoSync,
  shouldSkipCompatCheck,
  type CompatHostCache,
} from '../src/core/compat-check.ts';
import { isAeSandboxRuntime } from '../src/core/sandbox-runtime.ts';

const prevSandbox = process.env.SANDBOX_RUNTIME_ROOT;
const prevNoCompat = process.env.AE_CLI_NO_COMPAT_CHECK;
const prevCi = process.env.CI;

delete process.env.SANDBOX_RUNTIME_ROOT;
delete process.env.AE_CLI_NO_COMPAT_CHECK;
delete process.env.CI;

assert.equal(isAeSandboxRuntime(), false);

process.env.SANDBOX_RUNTIME_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-sandbox-'));
assert.equal(isAeSandboxRuntime(), true);
assert.equal(shouldSkipCompatCheck(['node', 'ae-cli', 'auth', 'status']), true);

delete process.env.SANDBOX_RUNTIME_ROOT;
process.env.AE_CLI_NO_COMPAT_CHECK = '1';
assert.equal(shouldSkipCompatCheck(['node', 'ae-cli', 'auth', 'status']), true);

delete process.env.AE_CLI_NO_COMPAT_CHECK;
assert.equal(shouldSkipCompatCheck(['node', 'ae-cli', '--version']), true);
assert.equal(shouldSkipAutoSync(['node', 'ae-cli', 'auth', 'logout']), true);
assert.equal(shouldSkipAutoSync(['node', 'ae-cli', '--host', 'https://example.com', 'config']), true);
assert.equal(shouldSkipAutoSync(['node', 'ae-cli', 'update']), true);
assert.equal(shouldSkipAutoSync(['node', 'ae-cli', 'install']), true);
assert.equal(shouldSkipAutoSync(['node', 'ae-cli', 'analysis', 'report', 'list']), false);

const now = new Date('2026-10-14T08:00:00.000Z').getTime();
const hour = 60 * 60 * 1000;
const entry: CompatHostCache = {
  host: 'https://compat.example.invalid',
  localVersion: '6.0.52',
  expectedVersion: '6.0.52',
  clusterVersion: '6.0',
  lastFetchedAt: new Date(now).toISOString(),
  lastNotifiedAt: new Date(now).toISOString(),
};

assert.equal(isCompatCacheStale(undefined, now), true);
assert.equal(isCompatCacheStale(entry, now), false);
assert.equal(isCompatCacheStale(entry, now + hour - 1), false);
assert.equal(isCompatCacheStale(entry, now + hour), true);
assert.equal(isCompatCacheStale(entry, now + 2 * hour), true);
assert.equal(isCompatCacheStale(entry, now + 24 * hour), true);

assert.equal(shouldNotifyCompat(undefined, now), true);
assert.equal(shouldNotifyCompat({ ...entry, lastNotifiedAt: undefined }, now), true);
assert.equal(shouldNotifyCompat(entry, now + hour), false);
assert.equal(shouldNotifyCompat(entry, now + 24 * hour - 1), false);
assert.equal(shouldNotifyCompat(entry, now + 24 * hour), true);

if (prevSandbox === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
else process.env.SANDBOX_RUNTIME_ROOT = prevSandbox;
if (prevNoCompat === undefined) delete process.env.AE_CLI_NO_COMPAT_CHECK;
else process.env.AE_CLI_NO_COMPAT_CHECK = prevNoCompat;
if (prevCi === undefined) delete process.env.CI;
else process.env.CI = prevCi;

process.stdout.write('compat-check skip and interval tests: passed\n');
