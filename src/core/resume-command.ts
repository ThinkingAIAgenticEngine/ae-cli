import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type ResumeCommandResult =
  | { status: 'exited'; code: number }
  | { status: 'signaled'; signal: NodeJS.Signals }
  | { status: 'not-started' };

/** Start the verified installation once, before the old process executes any business command. */
export async function resumeSyncedCommand(
  entrypoint: string | undefined,
  args: string[] = process.argv.slice(2),
): Promise<ResumeCommandResult> {
  try {
    if (!entrypoint || !path.isAbsolute(entrypoint)) return { status: 'not-started' };
    if (!fs.statSync(entrypoint).isFile()) return { status: 'not-started' };
    fs.accessSync(entrypoint, fs.constants.R_OK);
  } catch {
    return { status: 'not-started' };
  }

  return new Promise((resolve) => {
    const isolateProcessGroup = process.platform !== 'win32';
    let child: childProcess.ChildProcess;
    try {
      // Direct Node invocation preserves arguments on Windows without a command shim or shell.
      child = childProcess.spawn(process.execPath, [entrypoint, ...args], {
        cwd: process.cwd(),
        stdio: 'inherit',
        // Terminal group signals must reach the child only through this parent.
        detached: isolateProcessGroup,
        env: { ...process.env, AE_CLI_NO_COMPAT_CHECK: '1' },
      });
    } catch {
      resolve({ status: 'not-started' });
      return;
    }

    let started = false;
    const forward = (signal: NodeJS.Signals) => {
      try {
        if (isolateProcessGroup) {
          if (child.pid && child.pid > 0) process.kill(-child.pid, signal);
        } else child.kill(signal);
      } catch { /* Wait for the child's actual result. */ }
    };
    const handlers = new Map<NodeJS.Signals, () => void>([
      ['SIGINT', () => forward('SIGINT')],
      ['SIGTERM', () => forward('SIGTERM')],
    ]);
    if (isolateProcessGroup) {
      handlers.set('SIGHUP', () => forward('SIGHUP'));
      handlers.set('SIGTSTP', () => {
        // Job-control stops are ignored by orphaned groups; stop the child group explicitly.
        forward('SIGSTOP');
        process.kill(process.pid, 'SIGSTOP');
      });
      handlers.set('SIGCONT', () => forward('SIGCONT'));
      handlers.set('SIGWINCH', () => forward('SIGWINCH'));
    }
    for (const [signal, handler] of handlers) process.on(signal, handler);
    const finish = (result: ResumeCommandResult) => {
      for (const [signal, handler] of handlers) process.removeListener(signal, handler);
      resolve(result);
    };
    child.once('spawn', () => { started = true; });
    child.on('error', () => {
      if (!started) finish({ status: 'not-started' });
    });
    child.once('close', (code, signal) => {
      finish(signal ? { status: 'signaled', signal } : { status: 'exited', code: code ?? 1 });
    });
  });
}
