import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const fixtureHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-business-config-'));
const previousHome = process.env.HOME;
process.env.HOME = fixtureHome;
const {
  BUSINESS_CONFIG_TTL_MS,
  peekBusinessConfig,
  readBusinessConfig,
  rememberBusinessConfig,
  resolveBusinessConfig,
} = await import('../src/core/business-config.js');
const {
  businessForCommand,
  businessForCapability,
  businessForSkill,
  getSkillBusinessState,
  normalizeBusinesses,
  selectBusinessSkills,
} = await import('../src/core/businesses.js');

after(() => {
  if (previousHome === undefined) delete process.env.HOME;
  else process.env.HOME = previousHome;
  fs.rmSync(fixtureHome, { recursive: true, force: true });
});

test('only explicit component booleans are normalized and analysis is permanent', () => {
  assert.deepEqual(normalizeBusinesses({ analysis: false, agent: false, dataops: true, engage: 'false', community: null, future: true }), {
    agent: false, dataops: true,
  });
  for (const value of [undefined, null, [], 'false', false]) assert.deepEqual(normalizeBusinesses(value), {});
  assert.equal(businessForCommand(['data-integration', 'upload']), undefined);
  for (const name of ['auth', 'config', 'capability', 'install', 'update', 'help', 'analysis', 'project', 'tracking', 'metadata']) {
    assert.equal(businessForCommand([name, 'list']), undefined, name);
  }
});

test('all actual optional commands and mixed system leaves use the business mapping', async () => {
  for (const [module, expected] of [
    ['te-dataops', 'dataops'], ['te-engage', 'engage'], ['te-community', 'community'], ['te-system', 'agent'],
    ['te-kb', 'agent'], ['te-team', 'agent'], ['te-agent', 'agent'], ['evaluation', 'agent'], ['context', 'agent'],
  ] as const) {
    const commands = (await import(`../src/commands/${module}/index.js`)).default;
    assert.ok(commands.length > 0);
    for (const command of commands) {
      const commandPath = [command.service, ...(command.resource?.split(/\s+/) ?? []), command.command];
      assert.equal(businessForCommand(commandPath), expected, commandPath.join(' '));
    }
  }
  const analysisCommands = (await import('../src/commands/te-analysis/index.js')).default;
  for (const command of analysisCommands) {
    const commandPath = [command.service, ...(command.resource?.split(/\s+/) ?? []), command.command];
    assert.equal(businessForCommand(commandPath), undefined, commandPath.join(' '));
  }
  for (const service of ['sync', 'model', 'memory', 'automation', 'things', 'workspace']) {
    assert.equal(businessForCommand([service]), 'agent', service);
  }
  assert.equal(businessForCapability('system.member.list'), undefined);
  assert.equal(businessForCapability('dataops.table.list'), 'dataops');
  assert.equal(businessForCapability('engage.flow.list'), 'engage');
});

test('Skill selection removes only explicitly disabled businesses', () => {
  const names = ['ae-capability', 'ae-analysis', 'ae-data-integration', 'ae-metadata', 'ae-dataops', 'ae-engage', 'ae-kb', 'ae-system', 'ae-page-context', 'ae-community'];
  assert.deepEqual(selectBusinessSkills(names, { dataops: false, agent: false }), [
    'ae-capability', 'ae-analysis', 'ae-data-integration', 'ae-metadata', 'ae-engage', 'ae-community',
  ]);
  assert.equal(getSkillBusinessState('ae-kb', {}), undefined);
  assert.equal(getSkillBusinessState('ae-dataops', { dataops: true }), true);
  assert.equal(getSkillBusinessState('ae-analysis', {}), true);
  assert.equal(businessForSkill('ae-evaluation'), 'agent');
  for (const name of ['ae-capability', 'ae-analysis', 'ae-analysis-global', 'ae-data-integration-helper', 'future-skill']) {
    assert.equal(businessForSkill(name), undefined, name);
    assert.equal(getSkillBusinessState(name, { dataops: false, engage: false, agent: false, community: false }), true, name);
  }
});

test('cache separates hosts and credentials without persisting tokens', () => {
  const now = Date.now();
  rememberBusinessConfig('https://a.example/', 'cli_business_fixture_a', { agent: false }, now);
  assert.deepEqual(peekBusinessConfig('https://a.example', 'cli_business_fixture_a', now), { agent: false });
  assert.equal(peekBusinessConfig('https://b.example', 'cli_business_fixture_a', now), undefined);
  assert.equal(peekBusinessConfig('https://a.example', 'cli_business_fixture_b', now), undefined);
  const file = path.join(fixtureHome, '.ae-cli', 'business-config.json');
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /cli_business_fixture/);
  if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('fresh execution cache expires while read-only help retains the last successful snapshot', () => {
  const now = Date.now();
  rememberBusinessConfig('https://stale.example', 'cli_stale_fixture', { dataops: false }, now - BUSINESS_CONFIG_TTL_MS);
  assert.equal(peekBusinessConfig('https://stale.example', 'cli_stale_fixture', now), undefined);
  assert.deepEqual(readBusinessConfig('https://stale.example', 'cli_stale_fixture'), { dataops: false });
});

test('expired false refreshes once and a failure becomes unknown without losing help state', async () => {
  const now = Date.now();
  const host = 'https://failed.example';
  const token = 'cli_failed_fixture';
  rememberBusinessConfig(host, token, { dataops: false }, now - BUSINESS_CONFIG_TTL_MS);
  let fetches = 0;
  const fetchRemote = async () => { fetches += 1; throw new Error('offline'); };
  assert.deepEqual(await resolveBusinessConfig(host, token, fetchRemote, now), {});
  assert.deepEqual(await resolveBusinessConfig(host, token, fetchRemote, now + 1), {});
  assert.equal(fetches, 1);
  assert.deepEqual(readBusinessConfig(host, token), { dataops: false });
});

test('successful refresh replaces the old state and old servers never mean disabled', async () => {
  const now = Date.now();
  const host = 'https://refresh.example';
  const token = 'cli_refresh_fixture';
  rememberBusinessConfig(host, token, { dataops: false }, now - BUSINESS_CONFIG_TTL_MS);
  assert.deepEqual(await resolveBusinessConfig(host, token, async () => ({ businesses: { dataops: true, agent: false } }), now), {
    dataops: true, agent: false,
  });
  assert.deepEqual(await resolveBusinessConfig(host, token, async () => ({}), now + BUSINESS_CONFIG_TTL_MS), {});
  assert.deepEqual(readBusinessConfig(host, token), {});
});
