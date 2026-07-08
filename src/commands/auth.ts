import { Command } from 'commander';
import { resolveHost } from '../core/auth.js';
import { loadConfig, saveConfig, removeHost, getFallbackCliToken } from '../core/config.js';
import { printOutput, printError } from '../framework/output.js';
import { clearCliToken, mintCliToken } from '../core/cli-token.js';
import { logger } from '../core/logger.js';
import {
  runDeviceFlow,
  authorizeDevice,
  pollDeviceFlow,
  buildVerificationUrl,
  DeviceFlowUnsupportedError,
  type DeviceTokenResponse,
} from '../core/device-auth.js';
import { save as secureStoreSave, load as secureStoreLoad, clear as secureStoreClear } from '../core/secure-store.js';

/** Shared --host flag description (also available globally: ae-cli --host <url> auth <cmd>) */
const HOST_OPTION_DESC = 'Override active AE host URL (e.g., https://ta.thinkingdata.cn)';

type AuthHostOpts = { host?: string };

function getExplicitAuthHostOverride(program: Command, opts: AuthHostOpts): string | undefined {
  return opts.host || program.opts().host;
}

/** Resolve host for auth commands: --host (or global --host) first, else config activeHost. */
function resolveAuthHost(program: Command, opts: AuthHostOpts): string {
  return resolveHost(getExplicitAuthHostOverride(program, opts));
}

/** After a successful login with an explicit --host, make that host the active one. */
export function activateHostAfterLogin(host: string, explicitHostOverride?: string): void {
  if (!explicitHostOverride) return;
  const config = loadConfig();
  if (!config.hosts[host]) {
    config.hosts[host] = { label: host };
  }
  config.activeHost = host;
  saveConfig(config);
  logger.info(`Active host set to ${host} after login`);
}

/** Persist device-flow tokens to the encrypted secure store (shared by the full and split-flow resume paths). */
async function persistDeviceTokens(host: string, tokens: DeviceTokenResponse): Promise<void> {
  // C2: expires_in is a server heuristic in seconds (~72000 = 20h); sanity-check before use
  const DEFAULT_EXPIRES_IN = 72000;
  const MAX_EXPIRES_IN = 86400 * 365; // 1 year upper bound
  let expiresInSeconds = tokens.expires_in ?? DEFAULT_EXPIRES_IN;
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0 || expiresInSeconds > MAX_EXPIRES_IN) {
    logger.warn(`auth login: expires_in=${tokens.expires_in} is out of range, falling back to ${DEFAULT_EXPIRES_IN}s`);
    expiresInSeconds = DEFAULT_EXPIRES_IN;
  }
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  // I1: refresh_token is optional (may be absent in dev-login); pass empty string when missing
  secureStoreSave(host, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? '',
    accessExpiresAt: expiresAt,
  });
  await mintCliToken(host);
}

/** Build the machine-readable login summary printed on success. */
function loginSummary(host: string, tokens: DeviceTokenResponse) {
  return {
    authenticated: true,
    host,
    token: tokens.access_token.slice(0, 8) + '...',
  };
}

/**
 * Resolve the te-claude base URL used by auth login (device code flow).
 * Uses the login host (--host or config activeHost), not TE_CLAUDE_BASE_URL (sandbox/agent runtime override).
 * te-claude is mounted at the host's base path (NEXT_PUBLIC_BASE_PATH; AE deployment convention is /agent).
 */
export function resolveLoginTeClaudeBase(host: string): string {
  const base = host.replace(/\/+$/, '');
  const basePath = process.env.TE_CLAUDE_BASE_PATH || '/agent';
  return base.endsWith(basePath) ? base : base + basePath;
}

export function registerAuth(program: Command): void {
  const auth = program.command('auth').description('Authentication management');

  auth
    .command('login')
    .description('Log in to AE using the device code flow (cross-platform; --no-browser to print URL only)')
    .option('--host <url>', HOST_OPTION_DESC)
    .option('--no-browser', 'Do not auto-open the browser; only print the authorization URL (headless / Linux)')
    .option('--no-wait', 'Request the device code and print the authorization URL as JSON, then exit without polling (for AI agents / split-flow). Resume with --device-code')
    .option('--device-code <code>', 'Resume a split-flow login: poll for the given device code until authorized, then save the token')
    .action(async (opts: { host?: string; browser: boolean; wait: boolean; deviceCode?: string }) => {
      const explicitHost = getExplicitAuthHostOverride(program, opts);
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printError('config', 'No AE host configured.', 'Run: ae-cli config set-host <url>');
        process.exit(1);
      }

      // Ensure the host exists in the config
      const config = loadConfig();
      if (!config.hosts[host]) {
        config.hosts[host] = { label: host };
        if (!config.activeHost) {
          config.activeHost = host;
        }
        saveConfig(config);
        logger.info(`Host config auto-saved for ${host}`);
        process.stderr.write(`[ae-cli] Config saved for ${host}\n`);
      }

      // opts.browser is false when the user passed --no-browser (commander default is true)
      const noBrowser = !opts.browser;
      const fmt = program.opts().format || 'json';
      const teClaudeBase = resolveLoginTeClaudeBase(host);
      const emit = (msg: string) => process.stderr.write(`[ae-cli] ${msg}\n`);

      try {
        // Split-flow resume: poll only for the provided device code, then save (no re-authorize)
        if (opts.deviceCode) {
          const tokens = await pollDeviceFlow(teClaudeBase, opts.deviceCode, {}, emit);
          await persistDeviceTokens(host, tokens);
          activateHostAfterLogin(host, explicitHost);
          logger.info(`Device flow login successful for ${host} (resumed)`);
          emit('Login successful! Token saved securely.');
          printOutput(loginSummary(host, tokens), fmt);
          return;
        }

        // Split-flow start: authorize only, print device code + URL as JSON, then exit without polling.
        // opts.wait is false when the user passed --no-wait (commander default is true).
        if (opts.wait === false) {
          const authResp = await authorizeDevice(teClaudeBase);
          printOutput(
            {
              device_code: authResp.device_code,
              user_code: authResp.user_code,
              verification_url: buildVerificationUrl(teClaudeBase, authResp.user_code),
              interval: authResp.interval,
              expires_in: authResp.expires_in,
              next: `Open verification_url in a browser to authorize, then run: ae-cli auth login --device-code ${authResp.device_code}`,
            },
            fmt,
          );
          return;
        }

        // Full blocking flow (authorize + poll in one shot)
        const tokens = await runDeviceFlow(teClaudeBase, { noBrowser }, emit);
        await persistDeviceTokens(host, tokens);
        activateHostAfterLogin(host, explicitHost);
        logger.info(`Device flow login successful for ${host}`);
        emit('Login successful! Token saved securely.');
        printOutput(loginSummary(host, tokens), fmt);
      } catch (err: any) {
        if (err instanceof DeviceFlowUnsupportedError) {
          printError(
            'auth',
            err.message,
            'Upgrade the AE server to a version that supports device login.',
          );
          process.exit(1);
        }
        printError('auth', err.message);
        process.exit(1);
      }
    });

  auth
    .command('status')
    .description('Show authentication status for a host (--host or active host)')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (opts: AuthHostOpts) => {
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printOutput({ authenticated: false, host: '(none)', hint: 'Run: ae-cli config set-host <url>' }, program.opts().format || 'json');
        return;
      }

      // Check secure-store first (written by the device code flow)
      const secureEntry = secureStoreLoad(host);
      if (secureEntry) {
        // F-010: a stored credential means logged in. `accessExpiresAt` is a STATIC snapshot from login,
        // but the server slides the access token on use, so it is advisory only — real validity is decided
        // lazily (a command returns an auth error when the session is truly gone). The cliToken is
        // non-expiring, so MCP/API-based commands stay authenticated regardless of the static access expiry
        // (minted eagerly at login — see hasCliToken).
        const pastStaticExpiry = new Date(secureEntry.accessExpiresAt).getTime() < Date.now();
        printOutput(
          {
            authenticated: true,
            host,
            source: 'secure-store',
            accessExpiresAt: secureEntry.accessExpiresAt,
            accessExpiresAtNote: 'advisory: access token auto-slides on use server-side; re-login only if a command returns an auth error',
            pastStaticExpiry,
            hasCliToken: !!secureEntry.cliToken,
          },
          program.opts().format || 'json',
        );
        return;
      }

      const fallbackCliToken = getFallbackCliToken(host);
      if (fallbackCliToken) {
        printOutput(
          {
            authenticated: true,
            host,
            source: 'sandbox-cli-token',
            hasCliToken: true,
            note: 'sandbox-provisioned cli-token.json; no user access token in secure-store',
          },
          program.opts().format || 'json',
        );
        return;
      }

      printOutput({ authenticated: false, host, source: 'none' }, program.opts().format || 'json');
    });

  auth
    .command('logout')
    .description('Clear stored credentials (access token, CLI token, and host config) for a host (--host or active host)')
    .option('--host <url>', HOST_OPTION_DESC)
    .action((opts: AuthHostOpts) => {
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printError('config', 'No AE host configured.', 'Run: ae-cli config set-host <url>');
        process.exit(1);
      }
      clearCliToken(host);
      secureStoreClear(host);
      removeHost(host);
      process.stderr.write(`[ae-cli] Credentials and config cleared for ${host}\n`);
      printOutput({ cleared: true, host }, program.opts().format || 'json');
    });
}
