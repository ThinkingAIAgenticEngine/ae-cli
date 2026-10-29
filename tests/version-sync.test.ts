import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const testHome = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-version-sync-')));
process.on('exit', () => fs.rmSync(testHome, { recursive: true, force: true }));
process.env.HOME = testHome;
const { syncBusinessSkills } = await import('../src/core/business-skill-sync.js');
const { skillCopyHash } = await import('../src/core/skills-tool.js');

const {
  buildVersionInstallPlan,
  evaluateAutoAttempt,
  installVersion,
  isAutoSyncTargetEligible,
  isRegularCliVersion,
  isPublicAeCliPackage,
  resolveNodeTool,
  recordVersionSyncResult,
  getPendingSkillsTarget,
  reserveAutoAttempt,
  autoSyncDirection,
} = await import('../src/core/version-sync.ts');

assert.equal(isAutoSyncTargetEligible('6.0.32'), false);
assert.equal(isAutoSyncTargetEligible('6.0.33'), true);
assert.equal(isAutoSyncTargetEligible('6.1.4'), false);
assert.equal(isAutoSyncTargetEligible('6.1.5'), true);
assert.equal(isAutoSyncTargetEligible('6.2.0'), true);
assert.equal(isAutoSyncTargetEligible('1.0.30'), false);
assert.equal(isAutoSyncTargetEligible('6.1.24'), true);
assert.equal(isAutoSyncTargetEligible(' v6.1.24 '), true);
assert.equal(isRegularCliVersion('6.0.54'), true);
assert.equal(isRegularCliVersion('v6.1.24'), true);
assert.equal(isRegularCliVersion('1.0.30'), true);
for (const version of [
  '', 'release/6.1', '6.1', '6.1.x', '6.1.5junk', '6.1.5.9', '6.1.5e3',
  '06.1.5', '6.01.5', '6.1.05', '-6.1.5', '6.1.-5',
  '6.1.24-rc.1', '6.1.24+build.1', '6.1.9007199254740992',
]) {
  assert.equal(isRegularCliVersion(version), false, `Non-release version: ${version}`);
  assert.equal(isAutoSyncTargetEligible(version), false, `Non-release target: ${version}`);
}
assert.equal(isPublicAeCliPackage('@thinkingai/ae-cli'), true);
assert.equal(isPublicAeCliPackage('@tant/ae-cli'), false);

// Explicit updates keep accepting exact SemVer even when automatic replacement skips it.
for (const target of ['6.1.24-rc.1', '6.1.24+build.1']) {
  const result = installVersion(target, { dryRun: true, packageName: '@thinkingai/ae-cli' });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.report?.cli.version, target);
  assert.ok(result.report?.commands?.[0].includes(`@thinkingai/ae-cli@${target}`));
}

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
const nextDayRepair = evaluateAutoAttempt({ target: '6.1.9', attemptDay: '2000-01-01', attemptsToday: 3,
  pendingSkills: true, lastFailureStage: 'skills_clients' }, '6.1.9', now);
assert.equal(nextDayRepair.allowed, true);
assert.equal(nextDayRepair.entry.attemptsToday, 0);
assert.equal(nextDayRepair.entry.pendingSkills, true);
assert.equal(nextDayRepair.entry.lastFailureStage, 'skills_clients');
assert.equal(evaluateAutoAttempt(nextDayRepair.entry, '6.1.10', now).entry.pendingSkills, undefined);

const plan = buildVersionInstallPlan('6.1.9', path.join('/tmp', 'npm root with spaces'));
assert.equal(plan.target, '6.1.9');
assert.match(plan.commands[0], /npm install -g @thinkingai\/ae-cli@6\.1\.9/);
assert.match(plan.commands[0], /--registry=https:\/\/registry\.npmjs\.org/);
assert.match(plan.commands[1], /npm root with spaces/);
assert.equal(plan.commands.length, 2);
assert.doesNotMatch(plan.commands.join(' '), /skills@.* add|#v/);
assert.deepEqual(plan.skillsSources, ['installed-package']);
assert.equal(
  resolveNodeTool('npm', path.join('/missing node', 'node.exe'), 'win32'),
  'npm.cmd',
);

function scenario(mode: 'local' | 'skip' | 'mismatch' | 'failed', platform = process.platform) {
  const fixture = fs.mkdtempSync(path.join(testHome, 'package-'));
  const root = platform === 'win32' ? path.join(fixture, 'node_modules') : path.join(fixture, 'lib', 'node_modules');
  const packageRoot = path.join(root, '@thinkingai', 'ae-cli');
  const skills = path.join(packageRoot, 'skills', 'ae-agent');
  const target = path.join(fixture, 'agent-skills');
  const bin = platform === 'win32' ? path.join(fixture, 'ae-cli.cmd') : path.join(fixture, 'bin', 'ae-cli');
  fs.mkdirSync(skills, { recursive: true });
  fs.mkdirSync(path.join(packageRoot, 'bin'));
  fs.mkdirSync(path.join(packageRoot, 'dist'));
  fs.mkdirSync(path.dirname(bin), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({ name: '@thinkingai/ae-cli', version: '6.1.9' }));
  fs.writeFileSync(path.join(packageRoot, 'bin', 'ae-cli.js'), '');
  fs.writeFileSync(path.join(skills, 'SKILL.md'), '---\nname: ae-agent\ndescription: "Fixture"\n---\n');
  if (platform === 'win32') fs.writeFileSync(bin, '@node "%dp0%\\node_modules\\@thinkingai\\ae-cli\\bin\\ae-cli.js" %*');
  else fs.symlinkSync(path.join(packageRoot, 'bin', 'ae-cli.js'), bin);
  const calls: string[][] = [];
  const result = installVersion('6.1.9', {
    packageName: '@thinkingai/ae-cli', skillsDirectory: target, nodeVersion: '20.19.5', platform,
    env: { PATH: path.dirname(bin) },
    skillStateDirectory: path.join(fixture, 'state'),
    skillContext: { host: '', tokenFingerprint: '' },
    syncSkills: options => syncBusinessSkills({ ...options, tool: {
      targets: () => {
        if (mode === 'failed') throw new Error('Private adapter failure');
        return [{ agent: 'universal', directory: target, detected: true, installable: true }];
      },
      apply: operations => operations.map(operation => {
        const destination = path.join(operation.target.directory, operation.skill);
        fs.rmSync(destination, { recursive: true, force: true });
        if (operation.action === 'install') fs.cpSync(operation.source, destination, { recursive: true });
        return { action: operation.action, skill: operation.skill, agent: operation.target.agent,
          path: destination, status: 'success', hash: skillCopyHash(destination) ?? undefined };
      }),
    } }),
    skipCliInstall: mode === 'skip',
    runner: (command, args) => {
      calls.push(args);
      const ok = (stdout = '') => ({ status: 0, stdout, stderr: '' });
      if (args[0] === 'root') return ok(root);
      if (args[0] === 'prefix') return ok(fixture);
      if (args[0] === '--version') return ok(command === bin ? (mode === 'mismatch' ? '6.1.8' : '6.1.9') : '10.8.2');
      throw new Error('Unexpected process invocation');
    },
  });
  return { result, calls };
}
for (const platform of new Set([process.platform, 'win32'] as const)) {
  for (const mode of ['local', 'skip'] as const) {
    const { result, calls } = scenario(mode, platform);
    assert.equal(result.ok, true, JSON.stringify(result));
    if (result.ok) assert.equal(result.skillsSource, 'local');
    assert.equal(calls.some(args => args[0] === 'install'), false);
    assert.equal(result.report?.skills.installed_count, 1);
    const adds = calls.filter(args => args.includes('add'));
    assert.equal(adds.length, 0);
  }
  const mismatch = scenario('mismatch', platform).result;
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.equal(mismatch.stage, 'package_validation');
  const timeout = scenario('failed', platform).result;
  assert.equal(timeout.ok, false);
  if (!timeout.ok) {
    assert.equal(timeout.cause, 'validation');
    assert.equal(timeout.skillsPending, true);
    assert.equal(timeout.stage, 'skills_local');
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

// Preserve the on-disk state contract used by historical updaters.
const legacyHost = 'https://legacy-cluster.example';
fs.writeFileSync(path.join(testHome, '.ae-cli', 'version-sync.json'), JSON.stringify({ hosts: {
  [legacyHost]: { target: '6.0.50', attemptDay: '2026-09-18', attemptsToday: 1,
    lastAttemptAt: '2026-09-18T00:00:00.000Z', pendingSkills: true, lastFailureStage: 'skills_github' },
} }));
assert.equal(getPendingSkillsTarget(legacyHost), '6.0.50');
recordVersionSyncResult(legacyHost, '6.0.50', { ok: true, cliInstalled: true, skillsSource: 'local' });
assert.equal(getPendingSkillsTarget(legacyHost), undefined);
assert.equal(autoSyncDirection('6.0.50', '6.0.40'), 'downgrade');
assert.equal(autoSyncDirection('6.0.40', '6.0.50'), 'upgrade');
assert.equal(autoSyncDirection('6.0.40', '6.1.9'), 'switch');
assert.equal(reserveAutoAttempt(legacyHost, '6.0.40', now).allowed, true);
assert.equal(reserveAutoAttempt(legacyHost, '6.0.50', now).allowed, true);
assert.equal(reserveAutoAttempt('https://second-cluster.example', '6.1.9', now).allowed, true);

fs.rmSync(testHome, { recursive: true, force: true });
process.stdout.write('version-sync tests: passed\n');
