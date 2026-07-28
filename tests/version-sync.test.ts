import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-version-sync-'));
process.env.HOME = testHome;

const {
  buildVersionInstallPlan,
  evaluateAutoAttempt,
  installVersion,
  isAutoSyncTargetEligible,
  isPublicAeCliPackage,
  resolveNodeTool,
} = await import('../src/core/version-sync.ts');

assert.equal(isAutoSyncTargetEligible('6.0.32'), false);
assert.equal(isAutoSyncTargetEligible('6.0.33'), true);
assert.equal(isAutoSyncTargetEligible('6.1.4'), false);
assert.equal(isAutoSyncTargetEligible('6.1.5'), true);
assert.equal(isAutoSyncTargetEligible('6.2.0'), true);
assert.equal(isAutoSyncTargetEligible('1.0.30'), false);
assert.equal(isPublicAeCliPackage('@thinkingai/ae-cli'), true);
assert.equal(isPublicAeCliPackage('@tant/ae-cli'), false);

const now = new Date('2026-07-28T08:00:00.000Z');
const firstAttempt = evaluateAutoAttempt(undefined, '6.1.9', now);
assert.equal(firstAttempt.allowed, true);

const hourlyLimited = evaluateAutoAttempt(
  {
    target: '6.1.9',
    attemptDay: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    attemptsToday: 1,
    lastAttemptAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
  },
  '6.1.9',
  now,
);
assert.equal(hourlyLimited.allowed, false);
assert.equal(hourlyLimited.reason, 'hourly_limit');

const dailyLimited = evaluateAutoAttempt(
  {
    target: '6.1.9',
    attemptDay: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    attemptsToday: 3,
    lastAttemptAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  },
  '6.1.9',
  now,
);
assert.equal(dailyLimited.allowed, false);
assert.equal(dailyLimited.reason, 'daily_limit');
assert.equal(evaluateAutoAttempt(dailyLimited.entry, '6.1.10', now).allowed, true);

const plan = buildVersionInstallPlan('6.1.9', path.join('/tmp', 'npm root with spaces'));
assert.equal(plan.target, '6.1.9');
assert.match(plan.commands[0], /npm install -g @thinkingai\/ae-cli@6\.1\.9/);
assert.match(plan.commands[1], /npm root with spaces/);
assert.match(plan.commands[2], /ThinkingAIAgenticEngine\/ae-cli#v6\.1\.9/);
assert.deepEqual(plan.skillsSources, ['installed-package', 'github-fallback']);
assert.equal(
  resolveNodeTool('npm', path.join('/missing node', 'node.exe'), 'win32'),
  'npm.cmd',
);

function createInstalledPackage(version: string): { root: string; skillsPath: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-global-root-'));
  const packageRoot = path.join(root, '@thinkingai', 'ae-cli');
  const skillsPath = path.join(packageRoot, 'skills');
  fs.mkdirSync(skillsPath, { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({ name: '@thinkingai/ae-cli', version }),
  );
  return { root, skillsPath };
}

{
  const installed = createInstalledPackage('6.1.9');
  const calls: string[][] = [];
  const result = installVersion('6.1.9', {
    runner: (_command, args) => {
      calls.push(args);
      if (args[0] === 'root') {
        return { status: 0, stdout: `${installed.root}\n`, stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.skillsSource, 'local');
  assert.equal(calls.some((args) => args.includes(`${installed.skillsPath}`)), true);
  assert.equal(calls.some((args) => args.some((arg) => arg.includes('ThinkingAIAgenticEngine'))), false);
}

{
  const installed = createInstalledPackage('6.1.9');
  let npmInstallCalled = false;
  const result = installVersion('6.1.9', {
    skipCliInstall: true,
    runner: (_command, args) => {
      if (args[0] === 'install') npmInstallCalled = true;
      if (args[0] === 'root') {
        return { status: 0, stdout: `${installed.root}\n`, stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(npmInstallCalled, false);
}

{
  const installed = createInstalledPackage('6.0.37');
  const calls: string[][] = [];
  const result = installVersion('6.0.37', {
    runner: (_command, args) => {
      calls.push(args);
      if (args[0] === 'root') {
        return { status: 0, stdout: `${installed.root}\n`, stderr: '' };
      }
      if (args.includes(installed.skillsPath)) {
        return { status: 1, stdout: '', stderr: 'local source unsupported' };
      }
      return { status: 0, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.skillsSource, 'github');
  assert.equal(
    calls.some((args) => args.includes('ThinkingAIAgenticEngine/ae-cli#v6.0.37')),
    true,
  );
}

{
  const installed = createInstalledPackage('6.1.8');
  const result = installVersion('6.1.9', {
    runner: (_command, args) => {
      if (args[0] === 'root') {
        return { status: 0, stdout: `${installed.root}\n`, stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.stage, 'package_validation');
    assert.equal(result.cause, 'validation');
  }
}

{
  const installed = createInstalledPackage('6.1.9');
  const result = installVersion('6.1.9', {
    runner: (_command, args) => {
      if (args[0] === 'root') {
        return { status: 0, stdout: `${installed.root}\n`, stderr: '' };
      }
      if (args[0] === 'install') {
        return { status: 0, stdout: '', stderr: '' };
      }
      return { status: 1, stdout: '', stderr: 'network timeout' };
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.stage, 'skills_github');
    assert.equal(result.cliInstalled, true);
    assert.equal(result.skillsPending, true);
    assert.equal(result.cause, 'timeout');
  }
}

{
  const configDir = path.join(testHome, '.ae-cli');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, 'version-sync.lock'), 'busy');
  const result = installVersion('6.1.9', {
    runner: () => {
      throw new Error('runner must not execute while the lock is held');
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.cause, 'busy');
  fs.unlinkSync(path.join(configDir, 'version-sync.lock'));
}

fs.rmSync(testHome, { recursive: true, force: true });
process.stdout.write('version-sync tests: passed\n');
