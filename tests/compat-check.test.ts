import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { shouldSkipCompatCheck } from '../src/core/compat-check.ts';
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

if (prevSandbox === undefined) delete process.env.SANDBOX_RUNTIME_ROOT;
else process.env.SANDBOX_RUNTIME_ROOT = prevSandbox;
if (prevNoCompat === undefined) delete process.env.AE_CLI_NO_COMPAT_CHECK;
else process.env.AE_CLI_NO_COMPAT_CHECK = prevNoCompat;
if (prevCi === undefined) delete process.env.CI;
else process.env.CI = prevCi;

process.stdout.write('compat-check skip tests: passed\n');
