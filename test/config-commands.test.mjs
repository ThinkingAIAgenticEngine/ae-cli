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
    activeLabel: 'prod',
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

  const table = runCli(home, ['--format', 'table', 'config', 'list']);
  assert.equal(table.status, 0, table.stderr);
  assert.match(table.stdout, /active/);
  assert.match(table.stdout, /prod/);
});

test('missing host guidance distinguishes existing customers from trial requests', () => {
  const home = tempHome();

  const status = runCli(home, ['auth', 'status']);
  assert.equal(status.status, 0, status.stderr);
  const data = parseJson(status.stdout).data;
  assert.equal(data.authenticated, false);
  assert.equal(data.host, '(none)');
  assert.equal(data.next_steps.configure_host, 'ae-cli config set-host <url>');
  assert.match(data.next_steps.existing_customer, /administrator/);
  assert.equal(data.next_steps.request_trial_url, 'https://thinkingai.cn/request-demo');

  const current = runCli(home, ['config', 'current']);
  assert.equal(current.status, 1);
  const error = parseJson(current.stderr).error;
  assert.match(error.hint, /ask your administrator/i);
  assert.match(error.hint, /https:\/\/thinkingai\.cn\/request-demo/);
});

test('configured hosts do not emit trial guidance', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.prod.example',
    hosts: {
      'https://ta.prod.example': { label: 'prod' },
    },
  });

  const current = runCli(home, ['config', 'current']);
  assert.equal(current.status, 0, current.stderr);
  assert.doesNotMatch(`${current.stdout}\n${current.stderr}`, /request-demo/);

  const status = runCli(home, ['auth', 'status']);
  assert.equal(status.status, 0, status.stderr);
  assert.equal(parseJson(status.stdout).data.host, 'https://ta.prod.example');
  assert.doesNotMatch(`${status.stdout}\n${status.stderr}`, /request-demo/);
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

test('config add creates environments and only activates when requested', () => {
  const home = tempHome();

  const first = runCli(home, ['config', 'add', 'ta.dev.example/', '--label', 'dev']);
  assert.equal(first.status, 0, first.stderr);
  assert.deepEqual(parseJson(first.stdout).data, {
    url: 'https://ta.dev.example',
    label: 'dev',
    active: true,
  });

  const second = runCli(home, ['config', 'add', 'https://ta.prod.example', '--label', 'prod']);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(parseJson(second.stdout).data, {
    url: 'https://ta.prod.example',
    label: 'prod',
    active: false,
  });
  assert.equal(readConfig(home).activeHost, 'https://ta.dev.example');

  const staging = runCli(home, ['config', 'add', 'https://ta.stage.example', '--label', 'stage', '--use']);
  assert.equal(staging.status, 0, staging.stderr);
  assert.equal(parseJson(staging.stdout).data.active, true);
  assert.equal(readConfig(home).activeHost, 'https://ta.stage.example');
});

test('config add rejects an existing URL without changing its label', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
    },
  });

  const result = runCli(home, ['config', 'add', 'https://ta.dev.example/', '--label', 'renamed']);
  assert.equal(result.status, 1);
  assert.match(parseJson(result.stderr).error.message, /already configured/);
  assert.equal(readConfig(home).hosts['https://ta.dev.example'].label, 'dev');
});

test('config rename selects by label and rejects empty or duplicate labels', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
      'https://ta.prod.example': { label: 'prod' },
    },
  });

  const renamed = runCli(home, ['config', 'rename', 'dev', 'development']);
  assert.equal(renamed.status, 0, renamed.stderr);
  assert.deepEqual(parseJson(renamed.stdout).data, {
    url: 'https://ta.dev.example',
    label: 'development',
    active: true,
  });
  assert.equal(readConfig(home).hosts['https://ta.dev.example'].label, 'development');

  const duplicate = runCli(home, ['config', 'rename', 'development', 'prod']);
  assert.equal(duplicate.status, 1);
  assert.match(parseJson(duplicate.stderr).error.message, /Label already exists/);
  assert.equal(readConfig(home).hosts['https://ta.dev.example'].label, 'development');
});

test('config remove deletes a non-active environment with --yes', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
      'https://ta.prod.example': { label: 'prod' },
    },
  });

  const result = runCli(home, ['config', 'remove', 'prod', '--yes']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(parseJson(result.stdout).data, {
    removed: true,
    url: 'https://ta.prod.example',
    label: 'prod',
    activeHost: 'https://ta.dev.example',
  });
  assert.equal(readConfig(home).hosts['https://ta.prod.example'], undefined);
});

test('config remove refuses to silently replace an active environment', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
      'https://ta.prod.example': { label: 'prod' },
    },
  });

  const result = runCli(home, ['config', 'remove', 'dev', '--yes']);
  assert.equal(result.status, 1);
  assert.match(parseJson(result.stderr).error.message, /Cannot remove the active/);
  assert.equal(readConfig(home).activeHost, 'https://ta.dev.example');
  assert.equal(Object.keys(readConfig(home).hosts).length, 2);
});

test('config remove can clear the only environment with --yes', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
    },
  });

  const result = runCli(home, ['config', 'delete', 'dev', '--yes']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(parseJson(result.stdout).data.activeHost, '');
  assert.deepEqual(readConfig(home), { activeHost: '', hosts: {} });
});

test('bare config fails safely without a TTY', () => {
  const home = tempHome();
  writeConfig(home, {
    activeHost: 'https://ta.dev.example',
    hosts: {
      'https://ta.dev.example': { label: 'dev' },
    },
  });

  const result = runCli(home, ['config']);
  assert.equal(result.status, 1);
  assert.match(parseJson(result.stderr).error.message, /requires a TTY/);
  assert.equal(readConfig(home).activeHost, 'https://ta.dev.example');
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

    try {
      updateHostLabel('https://unknown.example', 'unknown');
      console.error('unknown rename did not fail');
      process.exit(8);
    } catch (err) {
      if (!String(err.message).includes('Host is not configured')) {
        console.error(err.message);
        process.exit(9);
      }
    }

    try {
      updateHostLabel('https://ta.dev.example', '   ');
      console.error('empty rename did not fail');
      process.exit(10);
    } catch (err) {
      if (!String(err.message).includes('Label cannot be empty')) {
        console.error(err.message);
        process.exit(11);
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
