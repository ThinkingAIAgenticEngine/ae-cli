import assert from 'node:assert/strict';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, type TestContext } from 'node:test';

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae resume command '));
const loader = import.meta.resolve('tsx');
const resumeModule = new URL('../src/core/resume-command.ts', import.meta.url).href;
const runnerModule = new URL('../src/framework/runner.ts', import.meta.url).href;
const harness = path.join(testDirectory, 'resume harness.mjs');

fs.writeFileSync(harness, `
import fs from 'node:fs';
import { resumeSyncedCommand } from ${JSON.stringify(resumeModule)};
const entrypoint = process.argv[2] === '__undefined__' ? undefined : process.argv[2];
const pending = resumeSyncedCommand(entrypoint, process.argv.slice(3));
const heartbeat = process.env.AE_RESUME_PARENT_HEARTBEAT === '1'
  ? setInterval(() => fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, 'parent:tick\\n'), 20)
  : undefined;
if (process.env.AE_RESUME_HOLD_SIGNALS === '1') {
  const release = process.env.AE_RESUME_RELEASE_SIGNALS;
  const deadline = Date.now() + 10_000;
  while (!fs.existsSync(release) && Date.now() < deadline) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
  }
}
const result = await pending;
if (heartbeat) clearInterval(heartbeat);
if (process.env.AE_RESUME_RESULT) fs.writeFileSync(process.env.AE_RESUME_RESULT, JSON.stringify(result));
if (result.status === 'exited') process.exitCode = result.code;
else if (result.status === 'signaled') process.kill(process.pid, result.signal);
else process.exitCode = 78;
`);

after(() => fs.rmSync(testDirectory, { recursive: true, force: true }));

interface ProcessResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
}

function fixture(t: TestContext, source: string, filename = 'installed cli.mjs') {
  const directory = fs.mkdtempSync(path.join(testDirectory, 'scenario '));
  const entrypoint = path.join(directory, filename);
  fs.writeFileSync(entrypoint, source);
  const workingDirectory = path.join(directory, 'original working directory');
  fs.mkdirSync(workingDirectory);
  const cwd = fs.realpathSync(workingDirectory);

  function launch(
    args: string[] = [],
    entry: string | undefined = entrypoint,
    options: { isolateProcessGroup?: boolean; holdSignals?: boolean; trackLiveness?: boolean } = {},
  ) {
    const child = spawn(process.execPath, [harness, entry ?? '__undefined__', ...args], {
      cwd,
      env: {
        ...process.env,
        HOME: directory,
        USERPROFILE: directory,
        NODE_OPTIONS: `--import=${loader}`,
        AE_CLI_NO_COMPAT_CHECK: 'inherited-value',
        AE_CLI_NO_UPDATE_CHECK: '1',
        AE_RESUME_RESULT: path.join(directory, 'result.json'),
        AE_RESUME_EXECUTIONS: path.join(directory, 'executions.txt'),
        AE_RESUME_ENV: 'environment value with spaces and $characters',
        AE_RESUME_HOLD_SIGNALS: options.holdSignals ? '1' : '0',
        AE_RESUME_RELEASE_SIGNALS: path.join(directory, 'release-signals'),
        AE_RESUME_PARENT_HEARTBEAT: options.trackLiveness ? '1' : '0',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: options.isolateProcessGroup ?? false,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', chunk => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', chunk => stderr.push(Buffer.from(chunk)));
    const completion = new Promise<ProcessResult>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => resolve({
        code, signal, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr),
      }));
    });
    const deadline = setTimeout(() => child.kill('SIGKILL'), 15_000);
    completion.finally(() => clearTimeout(deadline)).catch(() => {});
    t.after(() => {
      clearTimeout(deadline);
      if (options.isolateProcessGroup && child.pid) {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { /* The process group has already exited. */ }
      }
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    });
    return { child, completion, stdout, stderr };
  }

  async function run(args: string[] = [], input: string | Buffer = '', entry?: string) {
    const running = launch(args, entry);
    running.child.stdin.end(input);
    return running.completion;
  }

  return {
    directory, entrypoint, cwd, launch, run,
    result: () => JSON.parse(fs.readFileSync(path.join(directory, 'result.json'), 'utf8')),
    executions: () => fs.existsSync(path.join(directory, 'executions.txt'))
      ? fs.readFileSync(path.join(directory, 'executions.txt'), 'utf8').trim().split('\n') : [],
  };
}

async function waitForOutput(
  child: ChildProcessWithoutNullStreams,
  output: Buffer[],
  expected: string | number,
): Promise<void> {
  const matches = () => typeof expected === 'number'
    ? Buffer.concat(output).length >= expected : Buffer.concat(output).includes(expected);
  if (matches()) return;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error(`Child did not emit ${JSON.stringify(expected)}`)), 10_000);
    function finish(error?: Error) {
      clearTimeout(timeout);
      child.stdout.off('data', check);
      child.stderr.off('data', check);
      child.off('close', closed);
      if (error) reject(error);
      else resolve();
    }
    function check() {
      if (matches()) finish();
    }
    function closed() {
      finish(new Error(`Child exited before emitting ${JSON.stringify(expected)}`));
    }
    child.stdout.on('data', check);
    child.stderr.on('data', check);
    child.once('close', closed);
    check();
  });
}

test('resumed command receives literal arguments, its original directory and environment', async t => {
  const f = fixture(t, `
process.stdout.write(JSON.stringify({
  argv: process.argv.slice(2), cwd: process.cwd(),
  environment: process.env.AE_RESUME_ENV,
  compatGuard: process.env.AE_CLI_NO_COMPAT_CHECK,
}));
`, 'installed cli $literal; entry.mjs');
  const args = [
    'project', 'info', 'list', '--host', 'https://example.invalid/path?a=1&b=2',
    '--input', JSON.stringify({ text: 'spaces, "quotes", $HOME, $(echo unsafe), `echo unsafe`', lines: 'first\nsecond' }),
    '--jq', '.items[] | select(.name == "a b")', '', '--', '; touch shell-ran', '*',
  ];
  const result = await f.run(args);
  assert.equal(result.code, 0, result.stderr.toString());
  assert.equal(result.signal, null);
  assert.equal(result.stderr.length, 0);
  assert.deepEqual(JSON.parse(result.stdout.toString()), {
    argv: args, cwd: f.cwd,
    environment: 'environment value with spaces and $characters', compatGuard: '1',
  });
  assert.deepEqual(f.result(), { status: 'exited', code: 0 });
  assert.equal(fs.existsSync(path.join(f.cwd, 'shell-ran')), false);
});

test('resumed command preserves piped stdin and separate binary stdout/stderr', async t => {
  const f = fixture(t, `
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
process.stdout.write(Buffer.concat(chunks));
process.stderr.write(Buffer.from([0, 255, 13, 10, 101, 114, 114]));
`);
  const input = Buffer.concat([Buffer.from([0, 255, 10, 13]), Buffer.from('piped data with spaces\n{"value":1}\n')]);
  const result = await f.run([], input);
  assert.equal(result.code, 0);
  assert.deepEqual(result.stdout, input);
  assert.deepEqual(result.stderr, Buffer.from([0, 255, 13, 10, 101, 114, 114]));
});

test('resumed command streams large stdout before its input ends', async t => {
  const size = 2 * 1024 * 1024;
  const f = fixture(t, `
import { once } from 'node:events';
const chunk = Buffer.alloc(64 * 1024, 120);
for (let index = 0; index < ${size} / chunk.length; index++) {
  if (!process.stdout.write(chunk)) await once(process.stdout, 'drain');
}
process.stderr.write('WAITING_FOR_INPUT\\n');
const input = [];
for await (const chunk of process.stdin) input.push(chunk);
process.stdout.write(Buffer.concat(input));
`);
  const running = f.launch();
  await waitForOutput(running.child, running.stderr, 'WAITING_FOR_INPUT\n');
  await waitForOutput(running.child, running.stdout, size);
  assert.equal(running.child.exitCode, null, 'The child must still be waiting for stdin');
  assert.equal(Buffer.concat(running.stdout).length, size);
  running.child.stdin.end('input after streamed output');
  const result = await running.completion;
  assert.equal(result.code, 0, result.stderr.toString());
  assert.deepEqual(result.stdout, Buffer.concat([Buffer.alloc(size, 120), Buffer.from('input after streamed output')]));
  assert.equal(result.stderr.toString(), 'WAITING_FOR_INPUT\n');
});

for (const code of [1, 23]) {
  test(`resumed business failure returns exit ${code} and executes only once`, async t => {
    const f = fixture(t, `
import fs from 'node:fs';
fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, 'executed\\n');
process.stdout.write('business output\\n');
process.stderr.write('business failure\\n');
process.exitCode = ${code};
`);
    const result = await f.run();
    assert.equal(result.code, code);
    assert.equal(result.stdout.toString(), 'business output\n');
    assert.equal(result.stderr.toString(), 'business failure\n');
    assert.deepEqual(f.executions(), ['executed']);
    assert.deepEqual(f.result(), { status: 'exited', code });
  });
}

test('missing, relative and directory entrypoints never execute a business command', async t => {
  const f = fixture(t, `
import fs from 'node:fs';
fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, 'executed\\n');
`);
  for (const entry of [path.join(f.directory, 'missing.mjs'), 'installed cli.mjs', f.directory]) {
    const result = await f.run([], '', entry);
    assert.equal(result.code, 78, result.stderr.toString());
    assert.equal(result.stdout.length, 0);
    assert.deepEqual(f.result(), { status: 'not-started' });
  }
  assert.deepEqual(f.executions(), []);
});

test('undefined entrypoint reports that execution did not start', async t => {
  const f = fixture(t, 'throw new Error("This entrypoint must never run");');
  const result = await f.run([], '', '__undefined__');
  assert.equal(result.code, 78, result.stderr.toString());
  assert.equal(result.stdout.length, 0);
  assert.deepEqual(f.result(), { status: 'not-started' });
});

test('a launched invalid JavaScript entry is a child failure rather than a retry', async t => {
  const f = fixture(t, 'this is invalid JavaScript;');
  const result = await f.run();
  assert.equal(result.code, 1);
  assert.match(result.stderr.toString(), /SyntaxError/);
  assert.deepEqual(f.result(), { status: 'exited', code: 1 });
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  test(`${signal} sent only to the waiting parent reaches the child without an orphan`, {
    skip: process.platform === 'win32' ? 'Native Windows does not provide POSIX signal exit semantics' : false,
  }, async t => {
    const f = fixture(t, `
import fs from 'node:fs';
process.on('${signal}', () => {
  fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, '${signal}\\n');
  process.removeAllListeners('${signal}');
  process.kill(process.pid, '${signal}');
});
process.stdout.write('READY:' + process.pid + '\\n');
setInterval(() => {}, 1000);
`);
    const running = f.launch();
    await waitForOutput(running.child, running.stdout, 'READY:');
    const childPid = Number(Buffer.concat(running.stdout).toString().trim().split(':')[1]);
    t.after(() => {
      try { process.kill(childPid, 'SIGKILL'); } catch { /* The expected case is an already reaped child. */ }
    });
    running.child.kill(signal);
    const result = await running.completion;
    assert.equal(result.code, null, result.stderr.toString());
    assert.equal(result.signal, signal);
    assert.deepEqual(f.executions(), [signal]);
    assert.deepEqual(f.result(), { status: 'signaled', signal });
    assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });
  });
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  test(`${signal} sent to the parent's process group reaches the resumed child once`, {
    skip: process.platform === 'win32' ? 'Native Windows does not provide POSIX process groups' : false,
    timeout: 10_000,
  }, async t => {
    const f = fixture(t, `
import fs from 'node:fs';
let received = false;
process.on('${signal}', () => {
  fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, '${signal}\\n');
  if (received) return;
  received = true;
  setTimeout(() => {
    process.removeAllListeners('${signal}');
    process.kill(process.pid, '${signal}');
  }, 750);
});
process.stdout.write('READY:' + process.pid + '\\n');
setInterval(() => {}, 1000);
`);
    const running = f.launch([], undefined, { isolateProcessGroup: true, holdSignals: true });
    t.after(() => {
      const match = Buffer.concat(running.stdout).toString().match(/(?:^|\n)READY:(\d+)/);
      if (!match) return;
      const childPid = Number(match[1]);
      for (const pid of [-childPid, childPid]) {
        try { process.kill(pid, 'SIGKILL'); } catch { /* Both groups must be cleaned up after a failed assertion. */ }
      }
    });
    await waitForOutput(running.child, running.stdout, 'READY:');
    const childPid = Number(Buffer.concat(running.stdout).toString().trim().split(':')[1]);
    assert.ok(running.child.pid);
    process.kill(-running.child.pid, signal);

    // Keep the parent event loop blocked until the same-group child has received the original signal.
    // A separately grouped child instead waits until the parent is released and forwards the signal.
    const deadline = Date.now() + 300;
    while (f.executions().length === 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    fs.writeFileSync(path.join(f.directory, 'release-signals'), 'released');

    const result = await running.completion;
    assert.equal(result.code, null, result.stderr.toString());
    assert.equal(result.signal, signal);
    assert.deepEqual(f.executions(), [signal]);
    assert.deepEqual(f.result(), { status: 'signaled', signal });
    assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });
  });
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  test(`${signal} sent only to the parent terminates the resumed command's descendants`, {
    skip: process.platform === 'win32' ? 'Native Windows does not provide POSIX process groups' : false,
    timeout: 10_000,
  }, async t => {
    const f = fixture(t, `
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const grandchild = spawn(process.execPath, [process.argv[2]], { stdio: 'inherit' });
let signaled = false;
let grandchildExited = false;
function finish() {
  if (!signaled || !grandchildExited) return;
  process.removeAllListeners('${signal}');
  process.kill(process.pid, '${signal}');
}
process.on('${signal}', () => {
  fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, 'child:${signal}\\n');
  signaled = true;
  finish();
});
grandchild.once('close', () => { grandchildExited = true; finish(); });
process.stdout.write('CHILD_READY:' + process.pid + '\\n');
`);
    const grandchildPath = path.join(f.directory, 'installed cli grandchild.mjs');
    fs.writeFileSync(grandchildPath, `
import fs from 'node:fs';
process.on('${signal}', () => {
  fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, 'grandchild:${signal}\\n');
  process.removeAllListeners('${signal}');
  process.kill(process.pid, '${signal}');
});
process.stdout.write('GRANDCHILD_READY:' + process.pid + '\\n');
setInterval(() => {}, 1000);
`);
    const running = f.launch([grandchildPath], undefined, { isolateProcessGroup: true });
    const pids: number[] = [];
    t.after(() => {
      const reportedPids = [...Buffer.concat(running.stdout).toString().matchAll(/(?:^|\n)(?:CHILD|GRANDCHILD)_READY:(\d+)/g)]
        .map(match => Number(match[1]));
      for (const pid of new Set([...pids, ...reportedPids])) {
        for (const target of [-pid, pid]) {
          try { process.kill(target, 'SIGKILL'); } catch { /* A failed forwarding assertion must not orphan descendants. */ }
        }
      }
    });
    await waitForOutput(running.child, running.stdout, 'GRANDCHILD_READY:');
    const output = Buffer.concat(running.stdout).toString();
    for (const prefix of ['CHILD_READY', 'GRANDCHILD_READY']) {
      const match = output.match(new RegExp('(?:^|\\n)' + prefix + ':(\\d+)'));
      assert.ok(match, output);
      pids.push(Number(match[1]));
    }
    running.child.kill(signal);
    const result = await running.completion;
    assert.equal(result.code, null, result.stderr.toString());
    assert.equal(result.signal, signal);
    assert.deepEqual(f.executions().sort(), [`child:${signal}`, `grandchild:${signal}`]);
    assert.deepEqual(f.result(), { status: 'signaled', signal });
    for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  });
}

test('SIGTSTP and SIGCONT sent only to the parent pause and resume both process groups', {
  skip: process.platform === 'win32' ? 'Native Windows does not provide POSIX job-control signals' : false,
  timeout: 10_000,
}, async t => {
  const f = fixture(t, `
import fs from 'node:fs';
const heartbeat = setInterval(() => fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, 'child:tick\\n'), 20);
process.on('SIGCONT', () => {
  fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, 'continued\\n');
  process.stdout.write('CONTINUED\\n');
});
process.stdin.on('data', () => {
  clearInterval(heartbeat);
  process.stdin.pause();
  process.stdout.write('FINISHED\\n');
});
process.stdout.write('CHILD_READY:' + process.pid + '\\n');
`);
  const running = f.launch([], undefined, { isolateProcessGroup: true, trackLiveness: true });
  t.after(() => {
    const match = Buffer.concat(running.stdout).toString().match(/(?:^|\n)CHILD_READY:(\d+)/);
    if (!match) return;
    const childPid = Number(match[1]);
    for (const pid of [-childPid, childPid]) {
      try { process.kill(pid, 'SIGKILL'); } catch { /* Failed stop/resume assertions must clean up stopped groups. */ }
    }
  });
  await waitForOutput(running.child, running.stdout, 'CHILD_READY:');
  const childPid = Number(Buffer.concat(running.stdout).toString().trim().split(':')[1]);
  const ticks = () => {
    const entries = f.executions();
    return {
      parent: entries.filter(entry => entry === 'parent:tick').length,
      child: entries.filter(entry => entry === 'child:tick').length,
    };
  };
  async function waitForProgress(previous: { parent: number; child: number }) {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const current = ticks();
      if (current.parent > previous.parent && current.child > previous.child) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.fail('Both process groups must continue making progress');
  }

  await waitForProgress({ parent: 2, child: 2 });
  running.child.kill('SIGTSTP');
  await new Promise(resolve => setTimeout(resolve, 150));
  const paused = ticks();
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.deepEqual(ticks(), paused, 'The child and waiting parent must both stop making progress');

  running.child.kill('SIGCONT');
  await waitForOutput(running.child, running.stdout, 'CONTINUED\n');
  await waitForProgress(paused);
  running.child.stdin.end('finish\n');
  const result = await running.completion;
  assert.equal(result.code, 0, result.stderr.toString());
  assert.equal(result.signal, null);
  assert.match(result.stdout.toString(), /FINISHED\n/);
  assert.deepEqual(f.result(), { status: 'exited', code: 0 });
  assert.equal(f.executions().filter(entry => entry === 'continued').length, 1);
  assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });
});

function highRiskFixture(t: TestContext) {
  return fixture(t, `
import fs from 'node:fs';
import { runCommand } from ${JSON.stringify(runnerModule)};
await runCommand({
  service: 'fixture', command: 'delete', description: 'Test high-risk confirmation',
  flags: [], risk: 'high-risk-write',
  async dryRun() { return { method: 'DELETE', url: '/fixture' }; },
  async validateInput() { return { valid: true }; },
  async execute() {
    fs.appendFileSync(process.env.AE_RESUME_EXECUTIONS, 'executed\\n');
    return { executed: true };
  },
}, {}, {
  format: 'json', yes: process.argv.includes('--yes'),
  dryRun: process.argv.includes('--dry-run'), validate: process.argv.includes('--validate'),
});
`);
}

test('resumed high-risk writes still reject non-interactive stdin without --yes', async t => {
  const f = highRiskFixture(t);
  const result = await f.run([], 'yes\n');
  assert.equal(result.code, 1);
  assert.equal(JSON.parse(result.stderr.toString()).error.code, 'CONFIRMATION_REQUIRED');
  assert.equal(result.stdout.length, 0);
  assert.deepEqual(f.executions(), []);
});

test('resumed high-risk writes preserve explicit --yes and execute once', async t => {
  const f = highRiskFixture(t);
  const result = await f.run(['--yes']);
  assert.equal(result.code, 0, result.stderr.toString());
  assert.deepEqual(JSON.parse(result.stdout.toString()), { ok: true, data: { executed: true } });
  assert.equal(result.stderr.length, 0);
  assert.deepEqual(f.executions(), ['executed']);
});

for (const [flag, data] of [
  ['--dry-run', { method: 'DELETE', url: '/fixture' }],
  ['--validate', { valid: true }],
] as const) {
  test(`resumed high-risk writes preserve ${flag} without executing`, async t => {
    const f = highRiskFixture(t);
    const result = await f.run([flag]);
    assert.equal(result.code, 0, result.stderr.toString());
    assert.deepEqual(JSON.parse(result.stdout.toString()), { ok: true, data });
    assert.equal(result.stderr.length, 0);
    assert.deepEqual(f.executions(), []);
  });
}
