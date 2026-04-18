import { Command } from 'commander';
import { getToken, clearToken, setTokenManual, getAuthStatus, resolveHost } from '../core/auth.js';
import { printOutput, printError } from '../framework/output.js';

export function registerAuth(program: Command): void {
  const auth = program.command('auth').description('Authentication management');

  auth
    .command('login')
    .description('Login to TE (auto-extract token from Chrome on macOS)')
    .action(async () => {
      const host = resolveHost(program.opts().host);
      if (!host) {
        printError('config', 'No TE host configured.', 'Run: ae-cli config set-host');
        process.exit(1);
      }
      try {
        const token = await getToken(host);
        process.stderr.write(`[ae-cli] Authenticated to ${host}\n`);
        printOutput({ authenticated: true, host, token: token.slice(0, 8) + '...' }, program.opts().format || 'json');
      } catch (err: any) {
        printError('auth', err.message);
        process.exit(1);
      }
    });

  auth
    .command('set-token <token>')
    .description('Manually set authentication token for active host')
    .action((token: string) => {
      const host = resolveHost(program.opts().host);
      if (!host) {
        printError('config', 'No TE host configured.', 'Run: ae-cli config set-host');
        process.exit(1);
      }
      setTokenManual(token, host);
      process.stderr.write(`[ae-cli] Token saved for ${host}\n`);
      printOutput({ saved: true, host }, program.opts().format || 'json');
    });

  auth
    .command('status')
    .description('Show current authentication status')
    .action(() => {
      const host = resolveHost(program.opts().host);
      if (!host) {
        printOutput({ authenticated: false, host: '(none)', hint: 'Run: ae-cli config set-host' }, program.opts().format || 'json');
        return;
      }
      const status = getAuthStatus(host);
      printOutput(status, program.opts().format || 'json');
    });

  auth
    .command('logout')
    .description('Clear stored token for active host')
    .action(() => {
      const host = resolveHost(program.opts().host);
      if (!host) {
        printError('config', 'No TE host configured.', 'Run: ae-cli config set-host');
        process.exit(1);
      }
      clearToken(host);
      process.stderr.write(`[ae-cli] Token cleared for ${host}\n`);
      printOutput({ cleared: true, host }, program.opts().format || 'json');
    });
}
