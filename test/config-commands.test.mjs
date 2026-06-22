import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

function test(name, fn) {
  try {
    fn();
    console.log(`  OK: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    throw err;
  }
}

function tempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ae-cli-config-'));
}

function configFile(home) {
  return path.join(home, '.ae-cli', 'config.json');
}

function writeConfig(home, config) {
  fs.mkdirSync(path.dirname(configFile(home)), { recursive: true });
  fs.writeFileSync(configFile(home), JSON.stringify(config, null, 2));
}

function readConfig(home) {
  return JSON.parse(fs.readFileSync(configFile(home), 'utf-8'));
}

function runCli(home, args) {
  return spawnSync('npx', ['tsx', 'src/index.ts', '--no-update-check', ...args], {
    cwd: ROOT,
    env: { ...process.env, HOME: home },
    encoding: 'utf-8',
    input: 'q',
    timeout: 10_000,
  });
}

function runCoreScript(home, script) {
  return spawnSync('npx', ['tsx', '--eval', script], {
    cwd: ROOT,
    env: { ...process.env, HOME: home },
    encoding: 'utf-8',
    timeout: 10_000,
  });
}

function parseJson(text) {
  return JSON.parse(text);
}

console.log('config command tests');

test('config list and current expose configured hosts', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.prod.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
      'https://ta.prod.example': { label: 'prod' },
    },
  });

  const list = runCli(home, ['config', 'list']);
  assert.equal(list.status, 0, list.stderr);
  assert.deepEqual(parseJson(list.stdout).data, {
    activeHost: 'https://ta.prod.example',
    hosts: [
      { url: 'https://ta.dev.example', label: 'dev', active: false },
      { url: 'https://ta.prod.example', label: 'prod', active: true },
    ],
  });

  const current = runCli(home, ['config', 'current']);
  assert.equal(current.status, 0, current.stderr);
  assert.deepEqual(parseJson(current.stdout).data, {
    activeHost: 'https://ta.prod.example',
    label: 'prod',
  });
});

test('config use switches by exact url before label', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
      'https://ta.prod.example': { label: 'prod' },
    },
  });

  const result = runCli(home, ['config', 'use', 'https://ta.prod.example']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(parseJson(result.stdout).data, {
    activeHost: 'https://ta.prod.example',
    label: 'prod',
  });
  assert.equal(readConfig(home).activeHost, 'https://ta.prod.example');
});

test('config use switches by unique label', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
      'https://ta.prod.example': { label: 'prod' },
    },
  });

  const result = runCli(home, ['config', 'use', 'prod']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(parseJson(result.stdout).data, {
    activeHost: 'https://ta.prod.example',
    label: 'prod',
  });
  assert.equal(readConfig(home).activeHost, 'https://ta.prod.example');
});

test('config use treats non-url input as a label', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.prod.example': { label: 'prod-url' },
      'https://ta.label.example': { label: 'ta.prod.example' },
    },
  });

  const result = runCli(home, ['config', 'use', 'ta.prod.example']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(parseJson(result.stdout).data, {
    activeHost: 'https://ta.label.example',
    label: 'ta.prod.example',
  });
  assert.equal(readConfig(home).activeHost, 'https://ta.label.example');
});

test('config use rejects unknown environments without switching', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
      'https://ta.prod.example': { label: 'prod' },
    },
  });

  const result = runCli(home, ['config', 'use', 'staging']);
  assert.equal(result.status, 1);
  const error = parseJson(result.stderr).error;
  assert.equal(error.type, 'config');
  assert.match(error.message, /No AE environment matched/);
  assert.match(error.hint, /dev/);
  assert.match(error.hint, /prod/);
  assert.equal(readConfig(home).activeHost, 'https://ta.dev.example');
});

test('config use rejects duplicate labels without switching', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
      'https://ta.prod-a.example': { label: 'prod' },
      'https://ta.prod-b.example': { label: 'prod' },
    },
  });

  const result = runCli(home, ['config', 'use', 'prod']);
  assert.equal(result.status, 1);
  const error = parseJson(result.stderr).error;
  assert.equal(error.type, 'config');
  assert.match(error.message, /Duplicate label/);
  assert.match(error.hint, /ae-cli config/);
  assert.equal(readConfig(home).activeHost, 'https://ta.dev.example');
});

test('core config rejects duplicate labels when adding or renaming hosts', () => {
  const home = tempHome();
  const result = runCoreScript(home, `
    import { addHost, updateHostLabel, loadConfig } from './src/core/config.ts';

    addHost('https://ta.dev.example', 'dev');
    addHost('https://ta.prod.example', 'prod');

    try {
      addHost('https://ta.stage.example', 'prod');
      console.error('duplicate add did not fail');
      process.exit(2);
    } catch (err) {
      if (!String(err.message).includes('Label already exists: prod')) {
        console.error(err.message);
        process.exit(3);
      }
    }

    try {
      updateHostLabel('https://ta.dev.example', 'prod');
      console.error('duplicate rename did not fail');
      process.exit(4);
    } catch (err) {
      if (!String(err.message).includes('Label already exists: prod')) {
        console.error(err.message);
        process.exit(5);
      }
    }

    const config = loadConfig();
    if (Object.keys(config.hosts).length !== 2) {
      console.error('unexpected host count');
      process.exit(6);
    }
    if (config.hosts['https://ta.dev.example'].label !== 'dev') {
      console.error('duplicate rename changed existing label');
      process.exit(7);
    }
  `);
  assert.equal(result.status, 0, result.stderr);
});

console.log('All config command tests passed.');
