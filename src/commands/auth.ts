import { Command } from 'commander';
import { getToken, clearToken, setTokenManual, getAuthStatus, resolveHost } from '../core/auth.js';
import { loadConfig, saveConfig, removeHost } from '../core/config.js';
import { printOutput, printError } from '../framework/output.js';
import { validateToken } from '../core/auth.js';
import { setMcpTokenManual, clearMcpToken, validateMcpToken } from '../core/mcp.js';
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
function persistDeviceTokens(host: string, tokens: DeviceTokenResponse): void {
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
  // F-010: persist the (non-expiring) mcpToken as the durable credential so MCP-based commands stay logged in
  secureStoreSave(host, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? '',
    accessExpiresAt: expiresAt,
    mcpToken: tokens.mcp_token ?? undefined,
  });
}

/** Build the machine-readable login summary printed on success. */
function loginSummary(host: string, tokens: DeviceTokenResponse) {
  return {
    authenticated: true,
    host,
    token: tokens.access_token.slice(0, 8) + '...',
    mcpToken: tokens.mcp_token ? tokens.mcp_token.slice(0, 8) + '...' : null,
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
          persistDeviceTokens(host, tokens);
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
        persistDeviceTokens(host, tokens);
        activateHostAfterLogin(host, explicitHost);
        logger.info(`Device flow login successful for ${host}`);
        emit('Login successful! Token saved securely.');
        printOutput(loginSummary(host, tokens), fmt);
      } catch (err: any) {
        if (err instanceof DeviceFlowUnsupportedError) {
          printError(
            'auth',
            err.message,
            'Use `ae-cli auth set-token <token>` to authenticate, or upgrade the AE server to a version that supports device login.',
          );
          process.exit(1);
        }
        printError('auth', err.message);
        process.exit(1);
      }
    });

  auth
    .command('set-token <token>')
    .description('Manually set authentication token for a host (--host or active host)')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (token: string, opts: AuthHostOpts) => {
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
        process.stderr.write(`[ae-cli] Config saved for ${host}\n`);
        printOutput({ saved: true, config }, program.opts().format || 'json');
      }

      // Validate token
      process.stderr.write(`[ae-cli] Validating token...\n`);
      const isValid = await validateToken(token, host);
      if (!isValid) {
        logger.warn(`Token validation failed for ${host}`);
        process.stderr.write(`[ae-cli] Token validation failed\n`);
        printError('auth', 'Invalid token', 'Please check your token and try again');
        process.exit(1);
      }
      setTokenManual(token, host);
      logger.info(`Token manually set and validated for ${host}`);
      process.stderr.write(`[ae-cli] Token verified and saved for ${host}\n`);
      printOutput({ saved: true, host, verified: true }, program.opts().format || 'json');
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
        // lazily (a command returns an auth error when the session is truly gone). The mcpToken is
        // non-expiring, so MCP-based commands stay authenticated regardless of the static access expiry.
        const pastStaticExpiry = new Date(secureEntry.accessExpiresAt).getTime() < Date.now();
        printOutput(
          {
            authenticated: true,
            host,
            source: 'secure-store',
            accessExpiresAt: secureEntry.accessExpiresAt,
            accessExpiresAtNote: 'advisory: access token auto-slides on use server-side; re-login only if a command returns an auth error',
            pastStaticExpiry,
            hasMcpToken: !!secureEntry.mcpToken,
          },
          program.opts().format || 'json',
        );
        return;
      }

      // Fallback: check legacy access token cache (set-token / TE_TOKEN)
      const tokenStatus = getAuthStatus(host);
      const authenticated = tokenStatus.authenticated;

      printOutput({ authenticated, host, source: tokenStatus.source ?? 'none' }, program.opts().format || 'json');
    });

  auth
    .command('logout')
    .description('Clear stored token for a host (--host or active host)')
    .option('--host <url>', HOST_OPTION_DESC)
    .action((opts: AuthHostOpts) => {
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printError('config', 'No AE host configured.', 'Run: ae-cli config set-host <url>');
        process.exit(1);
      }
      clearToken(host);
      // I2: also clear secure-store so device-code tokens are wiped on logout
      secureStoreClear(host);
      removeHost(host);
      process.stderr.write(`[ae-cli] Token and config cleared for ${host}\n`);
      printOutput({ cleared: true, host }, program.opts().format || 'json');
    });

  auth
    .command('set-mcp-token <token>')
    .description('Manually set MCP token for a host (--host or active host)')
    .option('--host <url>', HOST_OPTION_DESC)
    .action(async (token: string, opts: AuthHostOpts) => {
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printError('config', 'No AE host configured.', 'Use --host <url> or run: ae-cli config set-host <url>');
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
        process.stderr.write(`[ae-cli] Host config saved for ${host}\n`);
      }

      // Validate MCP token
      process.stderr.write(`[ae-cli] Validating MCP token...\n`);
      const isValid = await validateMcpToken(token, host);
      if (!isValid) {
        process.stderr.write(`[ae-cli] MCP token validation failed\n`);
        printError('auth', 'Invalid MCP token', 'Please check your MCP token and try again');
        process.exit(1);
      }

      setMcpTokenManual(token, host);
      process.stderr.write(`[ae-cli] MCP token verified and saved for ${host}\n`);
      printOutput({ saved: true, host, verified: true, type: 'mcp-token' }, program.opts().format || 'json');
    });

  auth
    .command('clear-mcp-token')
    .description('Clear stored MCP token for a host (--host or active host; --all clears all)')
    .option('--host <url>', HOST_OPTION_DESC)
    .option('--all', 'Clear MCP tokens for all hosts')
    .action((opts: AuthHostOpts & { all?: boolean }) => {
      if (opts.all) {
        clearMcpToken();
        process.stderr.write(`[ae-cli] All MCP tokens cleared\n`);
        printOutput({ cleared: true, type: 'all-mcp-tokens' }, program.opts().format || 'json');
        return;
      }
      const host = resolveAuthHost(program, opts);
      if (!host) {
        printError('config', 'No AE host configured.', 'Use --host <url> or run: ae-cli config set-host <url>');
        process.exit(1);
      }
      clearMcpToken(host);
      process.stderr.write(`[ae-cli] MCP token cleared for ${host}\n`);
      printOutput({ cleared: true, host }, program.opts().format || 'json');
    });
}
