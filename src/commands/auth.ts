import { Command } from 'commander';
import { resolveHost } from '../core/auth.js';
import { normalizeUrl } from '../core/url-utils.js';
import { loadConfig, saveConfig, getFallbackCliToken } from '../core/config.js';
import { printOutput, printError } from '../framework/output.js';
import {
  clearCliTokenCache,
  mintCliToken,
  validateCliTokenOnServer,
  CliTokenValidationUnavailableError,
  type CliTokenValidationResult,
} from '../core/cli-token.js';
import { runHostCompatCheck } from '../core/compat-check.js';
import { getLocalCliPackageInfo } from '../core/package-info.js';
import { logger } from '../core/logger.js';
import { PermissionError } from '../core/errors.js';
import { missingAeHostGuidance, missingAeHostHint } from '../core/host-guidance.js';
import { MultiselectCancelled, promptSingleSelect } from '../core/multiselect.js';
import {
  runDeviceFlow,
  authorizeDevice,
  pollDeviceFlow,
  buildVerificationUrl,
  DeviceFlowUnsupportedError,
  type DeviceTokenResponse,
} from '../core/device-auth.js';
import {
  activateCredential,
  assertCredentialsReadable,
  clearAllCredentials,
  getActiveCredential,
  listCredentials,
  removeActiveCredential,
  saveCredential,
  updateCredentialMetadata,
  SecureStoreAuthError,
  CredentialStoreUnreadableError,
  type CredentialAccount,
  type StoredCredential,
} from '../core/secure-store.js';

const HOST_OPTION_DESC = 'Override active AE host URL (e.g., https://ta.thinkingdata.cn)';

type AuthHostOpts = { host?: string };

type SetTokenOpts = AuthHostOpts & {
  add?: boolean;
  tokenStdin?: boolean;
};

type AccountSelectionItem = {
  value: string;
  label: string;
};

function getExplicitAuthHostOverride(program: Command, opts: AuthHostOpts): string | undefined {
  return opts.host || program.opts().host;
}

function resolveAuthHost(program: Command, opts: AuthHostOpts): string {
  return resolveHost(getExplicitAuthHostOverride(program, opts));
}

type ValidationState = {
  valid: boolean;
  trusted: boolean;
  details: CliTokenValidationResult;
};

async function validateExistingCliToken(host: string, cliToken: string): Promise<ValidationState> {
  try {
    return { valid: true, trusted: false, details: await validateCliTokenOnServer(host, cliToken) };
  } catch (error) {
    if (error instanceof CliTokenValidationUnavailableError) {
      logger.warn(`auth status: ${error.message}; trusting the stored CLI token for compatibility`);
      return { valid: true, trusted: true, details: {} };
    }
    if (error instanceof PermissionError) {
      printError('permission', error.message, error.hint, error.code);
      process.exitCode = 1;
      return { valid: false, trusted: false, details: {} };
    }
    if (!(error instanceof SecureStoreAuthError)) throw error;
    printError(
      'auth',
      error.message,
      `Run: ae-cli auth logout --host ${host}, then ae-cli auth login --host ${host}`,
    );
    process.exitCode = 1;
    return { valid: false, trusted: false, details: {} };
  }
}

async function readCliTokenFromStdin(): Promise<string> {
  let value = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) value += chunk;
  return value.trim();
}

export function promptHiddenCliToken(): Promise<string> {
  const stdin = process.stdin;
  const stderr = process.stderr;
  if (!stdin.isTTY || !stderr.isTTY) {
    return Promise.reject(new Error(
      'Interactive CLI token input requires a TTY. Pipe the token and add --token-stdin.',
    ));
  }

  return new Promise<string>((resolve, reject) => {
    let value = '';
    let settled = false;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stderr.write('CLI token: ');

    function cleanup() {
      if (settled) return;
      settled = true;
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stderr.write('\n');
    }

    function onData(chunk: string) {
      for (const key of chunk) {
        if (key === '\r' || key === '\n') {
          cleanup();
          resolve(value.trim());
          return;
        }
        if (key === '\x03' || key === '\x1B') {
          cleanup();
          reject(new Error('CLI token input cancelled.'));
          return;
        }
        if (key === '\x04') {
          cleanup();
          resolve(value.trim());
          return;
        }
        if (key === '\x7F' || key === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        if (key >= ' ') value += key;
      }
    }

    stdin.on('data', onData);
  });
}

/** After a successful login with an explicit --host, make that host the active one. */
export function activateHostAfterLogin(host: string, explicitHostOverride?: string): void {
  if (!explicitHostOverride) return;
  const normalized = normalizeUrl(host);
  const config = loadConfig();
  if (!config.hosts[normalized]) config.hosts[normalized] = { label: normalized };
  config.activeHost = normalized;
  saveConfig(config);
  logger.info(`Active host set to ${normalized} after login`);
}

function accountOutput(account: CredentialAccount) {
  return {
    open_id: account.openId,
    login_name: account.loginName,
    user_name: account.userName,
  };
}

function credentialOutput(credential: StoredCredential, active: boolean) {
  return {
    credential_id: credential.id,
    active,
    ...(credential.account ? { account: accountOutput(credential.account) } : {}),
    cli_token: {
      ...(credential.cliTokenExpiresAt ? { expires_at: credential.cliTokenExpiresAt } : {}),
      ...(credential.lastRenewedOn ? { last_renewed_on: credential.lastRenewedOn } : {}),
    },
  };
}

export function buildAccountSelectionItems(
  credentials: StoredCredential[],
  activeCredentialId?: string,
): AccountSelectionItem[] {
  return credentials
    .filter((credential): credential is StoredCredential & { account: CredentialAccount } => Boolean(credential.account))
    .sort((left, right) => Number(right.id === activeCredentialId) - Number(left.id === activeCredentialId))
    .map((credential) => {
      const account = credential.account;
      const displayName = account.userName && account.userName !== account.loginName
        ? `${account.loginName} (${account.userName})`
        : account.loginName;
      const active = credential.id === activeCredentialId ? ' [active]' : '';
      return {
        value: account.openId,
        label: `${displayName} · ${account.openId}${active}`,
      };
    });
}

async function switchActiveAccount(
  program: Command,
  opts: AuthHostOpts & { account?: string },
): Promise<void> {
  const host = resolveAuthHost(program, opts);
  if (!host) {
    printError('config', 'No AE host configured.', missingAeHostHint());
    process.exitCode = 1;
    return;
  }

  let account = opts.account;
  if (!account) {
    if (!process.stdin.isTTY || !process.stderr.isTTY) {
      printError(
        'validation',
        'Interactive account selection requires a TTY.',
        `Run: ae-cli auth list --host ${host}, then ae-cli auth use --host ${host} --account <login-name-or-open-id>`,
      );
      process.exitCode = 1;
      return;
    }

    const active = getActiveCredential(host);
    const items = buildAccountSelectionItems(listCredentials(host), active?.id);
    if (items.length === 0) {
      printError(
        'auth',
        `No stored accounts with identity metadata for ${host}.`,
        `Upgrade the AE server if needed, then run: ae-cli auth login --host ${host}`,
      );
      process.exitCode = 1;
      return;
    }

    try {
      account = await promptSingleSelect({
        title: `Select an account for ${host} (up/down: move, enter: select, q: cancel)`,
        items,
      });
    } catch (error) {
      if (error instanceof MultiselectCancelled) return;
      throw error;
    }
  }

  try {
    const selected = activateCredential(host, account);
    clearCliTokenCache(host);
    await printOutput({
      host,
      active: true,
      account: accountOutput(selected.account!),
    }, program.opts().format || 'json');
  } catch (error: any) {
    if (error instanceof CredentialStoreUnreadableError) throw error;
    printError('auth', error.message);
    process.exitCode = 1;
  }
}

/** Exchange the one-time login access token, then persist only the resulting CLI token. */
export async function persistDeviceTokens(
  host: string,
  tokens: DeviceTokenResponse,
  options: { add?: boolean } = {},
): Promise<StoredCredential> {
  assertCredentialsReadable(host);
  const cliToken = await mintCliToken(host, tokens.access_token);
  let validation: CliTokenValidationResult = {};
  try {
    validation = await validateCliTokenOnServer(host, cliToken);
  } catch (error) {
    if (error instanceof CliTokenValidationUnavailableError) {
      logger.warn(`auth login: ${error.message}; saving CLI token without account metadata for compatibility`);
    } else {
      clearCliTokenCache(host);
      throw error;
    }
  }
  let saved: StoredCredential;
  try {
    saved = saveCredential(host, {
      cliToken,
      ...(validation.account ? { account: validation.account } : {}),
      ...(validation.cliTokenExpiresAt ? { cliTokenExpiresAt: validation.cliTokenExpiresAt } : {}),
    }, options);
  } catch (error) {
    clearCliTokenCache(host);
    throw error;
  }
  clearCliTokenCache(host);
  await runHostCompatCheck(getLocalCliPackageInfo(), host);
  return saved;
}

export async function persistManualCliToken(
  host: string,
  cliToken: string,
  options: { add?: boolean } = {},
): Promise<StoredCredential> {
  assertCredentialsReadable(host);
  const validation = await validateCliTokenOnServer(host, cliToken);
  let saved: StoredCredential;
  try {
    saved = saveCredential(host, {
      cliToken,
      ...(validation.account ? { account: validation.account } : {}),
      ...(validation.cliTokenExpiresAt ? { cliTokenExpiresAt: validation.cliTokenExpiresAt } : {}),
    }, options);
  } catch (error) {
    clearCliTokenCache(host);
    throw error;
  }
  clearCliTokenCache(host);
  await runHostCompatCheck(getLocalCliPackageInfo(), host);
  return saved;
}

function loginSummary(host: string, credential: StoredCredential) {
  return {
    authenticated: true,
    host,
    ...(credential.account ? { account: accountOutput(credential.account) } : {}),
  };
}

function manualTokenSummary(host: string, credential: StoredCredential) {
  return {
    authenticated: true,
    host,
    source: 'manual-cli-token',
    ...(credential.account ? { account: accountOutput(credential.account) } : {}),
    cli_token: {
      status: 'valid',
      ...(credential.cliTokenExpiresAt ? { expires_at: credential.cliTokenExpiresAt } : {}),
    },
  };
}

export function resolveLoginTeClaudeBase(host: string): string {
  const base = host.replace(/\/+$/, '');
  const basePath = process.env.TE_CLAUDE_BASE_PATH || '/agent';
  return base.endsWith(basePath) ? base : base + basePath;
}

export function registerAuth(program: Command): void {
  const auth = program
    .command('auth')
    .description('Manage authentication or switch the active account interactively')
    .hook('preAction', (_command, actionCommand) => {
      if (['login', 'set-token'].includes(actionCommand.name())) {
        const host = resolveAuthHost(program, actionCommand.opts());
        if (host) assertCredentialsReadable(host);
      }
    })
    .action(async () => {
      await switchActiveAccount(program, {});
    });

  auth
    .command('login')
    .description('Log in to AE; by default replaces this host credentials, --add keeps existing accounts')
    .option('--host <url>', HOST_OPTION_DESC)
    .option('--add', 'Add another account for the host and keep existing accounts')
    .option('--no-browser', 'Do not auto-open the browser; only print the authorization URL')
    .option('--no-wait', 'Print device authorization data and exit; resume with --device-code')
    .option('--device-code <code>', 'Resume a split-flow login with the given device code')
    .action(async (opts: { host?: string; add?: boolean; browser: boolean; wait: boolean; deviceCode?: string }) => {
      const explicitHost = getExplicitAuthHostOverride(program, opts);
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printError('config', 'No AE host configured.', missingAeHostHint());
        process.exit(1);
      }

      const config = loadConfig();
      if (!config.hosts[host]) {
        config.hosts[host] = { label: host };
        if (!config.activeHost) config.activeHost = host;
        saveConfig(config);
        process.stderr.write(`[ae-cli] Config saved for ${host}\n`);
      }

      const noBrowser = !opts.browser;
      const format = program.opts().format || 'json';
      const teClaudeBase = resolveLoginTeClaudeBase(host);
      const emit = (message: string) => process.stderr.write(`[ae-cli] ${message}\n`);

      try {
        if (opts.deviceCode) {
          const tokens = await pollDeviceFlow(teClaudeBase, opts.deviceCode, {}, emit);
          const saved = await persistDeviceTokens(host, tokens, { add: opts.add });
          activateHostAfterLogin(host, explicitHost);
          emit('Login successful! CLI token saved securely.');
          await printOutput(loginSummary(host, saved), format);
          return;
        }

        if (opts.wait === false) {
          const authResp = await authorizeDevice(teClaudeBase);
          const addFlag = opts.add ? ' --add' : '';
          await printOutput({
            device_code: authResp.device_code,
            user_code: authResp.user_code,
            verification_url: buildVerificationUrl(teClaudeBase, authResp.user_code),
            interval: authResp.interval,
            expires_in: authResp.expires_in,
            next: `Open verification_url in a browser to authorize, then run: ae-cli auth login${addFlag} --device-code ${authResp.device_code}`,
          }, format);
          return;
        }

        const tokens = await runDeviceFlow(teClaudeBase, { noBrowser }, emit);
        const saved = await persistDeviceTokens(host, tokens, { add: opts.add });
        activateHostAfterLogin(host, explicitHost);
        emit('Login successful! CLI token saved securely.');
        await printOutput(loginSummary(host, saved), format);
      } catch (error: any) {
        if (error instanceof CredentialStoreUnreadableError) throw error;
        if (error instanceof DeviceFlowUnsupportedError) {
          printError('auth', error.message, 'Upgrade the AE server to a version that supports device login.');
          process.exit(1);
        }
        if (error instanceof PermissionError) {
          printError('permission', error.message, error.hint, error.code);
          process.exit(1);
        }
        printError('auth', error.message);
        process.exit(1);
      }
    });

  auth
    .command('set-token')
    .description('Validate and securely store a CLI token copied from External Access Management')
    .option('--host <url>', HOST_OPTION_DESC)
    .option('--token-stdin', 'Read the CLI token from stdin instead of prompting')
    .option('--add', 'Add another account for the host and keep existing accounts')
    .action(async (opts: SetTokenOpts) => {
      const explicitHost = getExplicitAuthHostOverride(program, opts);
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printError('config', 'No AE host configured.', missingAeHostHint());
        process.exitCode = 1;
        return;
      }

      let cliToken: string;
      try {
        cliToken = opts.tokenStdin
          ? await readCliTokenFromStdin()
          : await promptHiddenCliToken();
      } catch (error: any) {
        printError('validation', error.message);
        process.exitCode = 1;
        return;
      }

      if (!/^cli_\S+$/.test(cliToken)) {
        printError(
          'validation',
          'Invalid CLI token format.',
          'Copy a current CLI token from External Access Management; the value must start with cli_.',
        );
        process.exitCode = 1;
        return;
      }

      try {
        const saved = await persistManualCliToken(host, cliToken, { add: opts.add });
        activateHostAfterLogin(host, explicitHost);
        process.stderr.write(`[ae-cli] CLI token verified and saved securely for ${host}\n`);
        await printOutput(manualTokenSummary(host, saved), program.opts().format || 'json');
      } catch (error: any) {
        if (error instanceof CredentialStoreUnreadableError) throw error;
        if (error instanceof PermissionError) {
          printError('permission', error.message, error.hint, error.code);
        } else if (error instanceof SecureStoreAuthError) {
          printError(
            'auth',
            error.message,
            'Copy a current CLI token from External Access Management and try again.',
          );
        } else if (error instanceof CliTokenValidationUnavailableError) {
          printError(
            'api',
            error.message,
            'Verify the AE host and deployment, then retry. The token was not saved.',
          );
        } else {
          printError('api', error.message);
        }
        process.exitCode = 1;
      }
    });

  auth
    .command('status')
    .description('Show the active CLI-token authentication status for a host')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (opts: AuthHostOpts) => {
      const host = resolveAuthHost(program, opts);
      if (!host) {
        await printOutput({
          authenticated: false,
          host: '(none)',
          hint: missingAeHostHint(),
          next_steps: missingAeHostGuidance(),
        }, program.opts().format || 'json');
        return;
      }

      const active = getActiveCredential(host);
      if (active) {
        const state = await validateExistingCliToken(host, active.cliToken);
        if (!state.valid) return;
        if (state.details.account || state.details.cliTokenExpiresAt) {
          updateCredentialMetadata(host, active.cliToken, state.details);
        }
        const current = getActiveCredential(host) ?? active;
        await printOutput({
          authenticated: true,
          host,
          source: 'secure-store',
          cli_token: {
            status: state.trusted ? 'trusted' : 'valid',
            ...(current.cliTokenExpiresAt ? { expires_at: current.cliTokenExpiresAt } : {}),
            ...(current.lastRenewedOn ? { last_renewed_on: current.lastRenewedOn } : {}),
          },
          ...(current.account ? { account: accountOutput(current.account) } : {}),
        }, program.opts().format || 'json');
        return;
      }

      const fallback = getFallbackCliToken(host);
      if (fallback) {
        const state = await validateExistingCliToken(host, fallback);
        if (!state.valid) return;
        await printOutput({
          authenticated: true,
          host,
          source: 'sandbox-cli-token',
          cli_token: {
            status: state.trusted ? 'trusted' : 'valid',
            ...(state.details.cliTokenExpiresAt ? { expires_at: state.details.cliTokenExpiresAt } : {}),
          },
          ...(state.details.account ? { account: accountOutput(state.details.account) } : {}),
        }, program.opts().format || 'json');
        return;
      }

      await printOutput({ authenticated: false, host, source: 'none' }, program.opts().format || 'json');
    });

  auth
    .command('list')
    .description('List stored accounts for one host (does not call the server)')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (opts: AuthHostOpts) => {
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printError('config', 'No AE host configured.', missingAeHostHint());
        process.exit(1);
      }
      const active = getActiveCredential(host);
      const credentials = listCredentials(host);
      await printOutput({
        host,
        accounts: credentials.map((credential) => credentialOutput(credential, credential.id === active?.id)),
      }, program.opts().format || 'json');
    });

  auth
    .command('use')
    .description('Switch the active account for a host; omit --account to choose interactively')
    .option('--account <login-name-or-open-id>', 'Login name or open_id returned by auth list')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (opts: AuthHostOpts & { account?: string }) => {
      await switchActiveAccount(program, opts);
    });

  auth
    .command('logout')
    .description('Remove the active account, or all accounts with --all')
    .option('--host <url>', HOST_OPTION_DESC)
    .option('--all', 'Remove all accounts stored for this host')
    .action(async (opts: AuthHostOpts & { all?: boolean }) => {
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printError('config', 'No AE host configured.', missingAeHostHint());
        process.exit(1);
      }
      clearCliTokenCache(host);
      if (opts.all) {
        clearAllCredentials(host);
        await printOutput({ cleared: true, all: true, host }, program.opts().format || 'json');
        return;
      }
      const result = removeActiveCredential(host);
      await printOutput({
        cleared: !!result.removed,
        all: false,
        host,
        remaining_accounts: listCredentials(host).length,
        ...(result.active?.account ? { active_account: accountOutput(result.active.account) } : {}),
      }, program.opts().format || 'json');
    });
}
