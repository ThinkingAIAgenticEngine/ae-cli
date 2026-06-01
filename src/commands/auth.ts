import { Command } from 'commander';
import { getToken, clearToken, setTokenManual, getAuthStatus, resolveHost } from '../core/auth.js';
import { loadConfig, saveConfig } from '../core/config.js';
import { printOutput, printError } from '../framework/output.js';
import { validateToken } from '../core/auth.js';
import { setMcpTokenManual, clearMcpToken, validateMcpToken, loadMcpTokenStore } from '../core/mcp.js';

export function registerAuth(program: Command): void {
  const auth = program.command('auth').description('Authentication management');

  auth
    .command('login')
    .description('Login to AE (auto-extract token from Chrome on macOS)')
    .action(async () => {
      const host = resolveHost(program.opts().host);
      if (!host) {
        printError('config', 'No AE host configured.', 'Run: ae-cli config set-host');
        process.exit(1);
      }

      // 确保 host 存在于配置中（与 auth set-token 行为一致）
      const config = loadConfig();
      if (!config.hosts[host]) {
        config.hosts[host] = { label: host };
        if (!config.activeHost) {
          config.activeHost = host;
        }
        saveConfig(config);
        process.stderr.write(`[ae-cli] Config saved for ${host}\n`);
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
    .action(async (token: string) => {
      const host = resolveHost(program.opts().host);
      if (!host) {
        printError('config', 'No AE host configured.', 'Run: ae-cli config set-host');
        process.exit(1);
      }
      // 确保 host 存在于配置中
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

      // 验证 token 是否有效
      process.stderr.write(`[ae-cli] Validating token...\n`);
      const isValid = await validateToken(token, host);
      if (!isValid) {
        process.stderr.write(`[ae-cli] Token validation failed\n`);
        printError('auth', 'Invalid token', 'Please check your token and try again');
        process.exit(1);
      }
      setTokenManual(token, host);
      process.stderr.write(`[ae-cli] Token verified and saved for ${host}\n`);
      printOutput({ saved: true, host, verified: true }, program.opts().format || 'json');
    });

  auth
    .command('status')
    .description('Show current authentication status')
    .action(async () => {
      const host = resolveHost(program.opts().host);
      if (!host) {
        printOutput({ authenticated: false, host: '(none)', hint: 'Run: ae-cli config set-host' }, program.opts().format || 'json');
        return;
      }

      // 检查 access token
      const tokenStatus = getAuthStatus(host);
      const hasValidToken = tokenStatus.authenticated;

      // 检查 MCP token
      const mcpStore = loadMcpTokenStore();
      const cachedMcpToken = mcpStore[host];
      let hasValidMcpToken = false;

      if (cachedMcpToken) {
        // 有缓存的 MCP token，验证是否有效
        hasValidMcpToken = await validateMcpToken(cachedMcpToken, host);
      }

      // 任一有效则显示 authenticated: true
      const authenticated = hasValidToken || hasValidMcpToken;

      printOutput({ authenticated, host }, program.opts().format || 'json');
    });

  auth
    .command('logout')
    .description('Clear stored token for active host')
    .action(() => {
      const host = resolveHost(program.opts().host);
      if (!host) {
        printError('config', 'No AE host configured.', 'Run: ae-cli config set-host');
        process.exit(1);
      }
      clearToken(host);
      process.stderr.write(`[ae-cli] Token cleared for ${host}\n`);
      printOutput({ cleared: true, host }, program.opts().format || 'json');
    });

  auth
    .command('set-mcp-token <token>')
    .description('Manually set MCP token for a host')
    .option('--host <host>', 'Target host URL (defaults to active host)')
    .action(async (token: string, opts: Record<string, any>) => {
      const host = opts.host || resolveHost(program.opts().host);
      if (!host) {
        printError('config', 'No AE host configured.', 'Use --host <url> or run: ae-cli config set-host');
        process.exit(1);
      }
      // 确保 host 存在于配置中
      const config = loadConfig();
      if (!config.hosts[host]) {
        config.hosts[host] = { label: host };
        if (!config.activeHost) {
          config.activeHost = host;
        }
        saveConfig(config);
        process.stderr.write(`[ae-cli] Host config saved for ${host}\n`);
      }

      // 验证 MCP token 是否有效
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
    .description('Clear stored MCP token for a host')
    .option('--host <host>', 'Target host URL (defaults to active host)')
    .option('--all', 'Clear MCP tokens for all hosts')
    .action((opts: Record<string, any>) => {
      if (opts.all) {
        clearMcpToken();
        process.stderr.write(`[ae-cli] All MCP tokens cleared\n`);
        printOutput({ cleared: true, type: 'all-mcp-tokens' }, program.opts().format || 'json');
        return;
      }
      const host = opts.host || resolveHost(program.opts().host);
      if (!host) {
        printError('config', 'No AE host configured.', 'Use --host <url> or run: ae-cli config set-host');
        process.exit(1);
      }
      clearMcpToken(host);
      process.stderr.write(`[ae-cli] MCP token cleared for ${host}\n`);
      printOutput({ cleared: true, host }, program.opts().format || 'json');
    });
}
