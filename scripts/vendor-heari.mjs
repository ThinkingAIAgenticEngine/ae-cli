// Usage: node scripts/vendor-heari.mjs /path/to/heari-cli
// A clean archive and upstream lockfile make the checked-in runtime reproducible.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const revision = '2fc589fe2c185edca7b82f868cd3470ce96569f3';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(process.argv[2]);
const temp = mkdtempSync(join(tmpdir(), 'ae-heari-'));
try {
  const archive = execFileSync('git', ['-C', source, 'archive', revision], { maxBuffer: 32 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', temp], { input: archive });
  execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: temp, stdio: 'inherit' });
  const require = createRequire(join(temp, 'package.json'));
  const { build } = require('esbuild');
  const { version } = require('./package.json');
  const target = join(root, 'bin/heari');
  mkdirSync(target, { recursive: true });
  // Keep AE-specific authentication and installation behavior in the distribution adapter.
  const actions = {
    'skills.mjs': ['installSkills', 'Use ae-cli install to install the matching Agent Skills.'],
    'update.mjs': ['updateCli', 'Use ae-cli update to update the bundled HearI CLI.'],
  };
  await build({
    absWorkingDir: temp, stdin: { contents: "export { run } from './src/app.mjs';", resolveDir: temp },
    outfile: join(target, 'engine.mjs'), format: 'esm', platform: 'node', target: 'node22', bundle: true,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'ae-distribution', setup(builder) {
      // Keep the help and machine-readable schema aligned with AE's ticket-based login.
      builder.onLoad({ filter: /[/\\]src[/\\]command[/\\]definitions\.mjs$/ }, ({ path }) => {
        const source = readFileSync(path, 'utf8');
        const start = source.indexOf("  register('login', {");
        const end = source.indexOf("  register('logout', {", start);
        if (start < 0 || end < 0) throw new Error('Cannot locate the pinned HearI login definition.');
        const login = {
          policy: { effects: ['remote-authentication', 'local-credentials-write'], confirmation: 'none', retry: 'inspect-before-retry', authentication: 'not-required-to-invoke' },
          description: ['使用当前 AE 账号登录此环境绑定的 HearI', 'Sign in to the HearI workspace registered with the current AE environment'],
          options: {
            endpoint: { type: 'string', valueName: 'URL', description: ['可选，核对预期 HearI 地址', 'Optional expected HearI endpoint'] },
            'no-browser': { type: 'boolean', description: ['兼容旧命令；AE 换票始终无需浏览器', 'Compatibility flag; AE ticket exchange always runs without a browser'] },
            'token-stdin': { type: 'boolean', description: ['从标准输入读取独立令牌，须指定对应 MCP 地址', 'Read an independent token from stdin with its explicit MCP endpoint'] },
          },
          examples: ['ae-cli heari login', 'ae-cli heari studies list --no-input'],
          notes: [['首先登录当前 AE。普通读取自动换取本次只读凭据。', 'Sign in to AE first. Reads automatically obtain a short-lived credential from the registered HearI workspace.']],
        };
        return { resolveDir: join(temp, 'src/command'), contents: source.slice(0, start) +
          "  register('login', " + JSON.stringify(login) + ");\n" + source.slice(end) };
      });
      builder.onLoad({ filter: /[/\\]src[/\\]auth[/\\]session\.mjs$/ }, ({ path }) => {
        const original = readFileSync(path, 'utf8')
          .replace('export async function authenticate(', 'async function standaloneAuthenticate(')
          .replace('return Boolean(values.web', 'if (context.aeCredentials) return false;\n  return Boolean(values.web')
          .replace('await saveCredentials(directory, credentials);', 'if (!credentials.aeSession) await saveCredentials(directory, credentials);');
        return { resolveDir: join(temp, 'src/auth'), contents: original + `
import { CliError } from '../core/errors.mjs';
export async function currentAeCredentials(expectedEndpoint, context) {
    function checkEndpoint(registeredEndpoint) {
      if (!expectedEndpoint) return;
      const url = new URL(endpoint(expectedEndpoint));
      if (url.pathname === '/') url.pathname = '/mcp';
      if (url.href !== registeredEndpoint) fail('CONFIG', 'HearI endpoint does not match the current AE registration.', '指定的 HearI 地址与当前 AE 环境的绑定不一致。');
    }
    let credentials;
    try {
      credentials = await context.aeCredentials(context.signal, checkEndpoint);
    } catch (error) {
      if (error instanceof CliError && error.code === 'CONFIG') throw error;
      if (error?.aeDiagnostic) throw Object.assign(new CliError('AUTH', error.message), { aeDiagnostic: error.aeDiagnostic, http_status: error.aeDiagnostic.http_status });
      fail('AUTH', 'Could not use the current AE login. Check AE credentials, HearI registration and workspace membership.');
    }
    if (credentials) {
      // Older providers only accept the signal. Verify their endpoint before making MCP calls.
      checkEndpoint(credentials.endpoint);
      return { ...credentials, aeSession: true };
    }
}
function prefersAeLogin(values, env, context) {
  return context.aeCredentials && !env.HEARI_TOKEN &&
    !values.web && !values.execute && !values['token-stdin'];
}
export async function authenticate(command, env, directory, context, stderr, locale, browserAuth) {
  if (command.name === 'login' && (env.HEARI_TOKEN || command.values['token-stdin']) &&
      !command.values.endpoint && !env.HEARI_ENDPOINT) {
    fail('CONFIG', 'An independent token requires its explicit HearI MCP endpoint.');
  }
  const aeLogin = command.name === 'login' && prefersAeLogin(command.values, env, context);
  if (context.aeCredentials && (aeLogin || command.name !== 'login') && !env.HEARI_TOKEN) {
    const credentials = await currentAeCredentials(command.values.endpoint || env.HEARI_ENDPOINT, context);
    if (credentials) return credentials;
  }
  if (aeLogin) fail('AUTH', 'Sign in to the current AE with ae-cli auth login, then retry.');
  return standaloneAuthenticate(command, env, directory, context, stderr, locale, browserAuth);
}` };
      });
      builder.onLoad({ filter: /[/\\]src[/\\]commands[/\\]doctor\.mjs$/ }, ({ path }) => {
        const source = readFileSync(path, 'utf8').replace('export async function doctor(', 'async function standaloneDoctor(');
        return { resolveDir: join(temp, 'src/commands'), contents: source + readFileSync(join(root, 'scripts/heari-doctor-adapter.mjs'), 'utf8') };
      });
      builder.onLoad({ filter: /[/\\]src[/\\]io[/\\]output\.mjs$/ }, ({ path }) => ({
        resolveDir: join(temp, 'src/io'),
        contents: readFileSync(path, 'utf8').replace(
          "const trialNotice = command?.name === 'login' && code === 'AUTH' && !browserAuth;",
          "const trialNotice = false;"
        ).replace('const detail = { code, message,', 'const detail = { code, message, ...error?.aeDiagnostic,'),
      }));
      builder.onLoad({ filter: /[/\\]src[/\\]core[/\\]paths\.mjs$/ }, () => ({
        contents: "export const packageRoot = new URL('./', import.meta.url);",
      }));
      builder.onLoad({ filter: /[/\\]src[/\\]commands[/\\](skills|update)\.mjs$/ }, ({ path }) => {
        const [name, message] = actions[path.split(/[/\\]/).pop()];
        return { resolveDir: join(temp, 'src/commands'), contents:
          `import { fail } from '../core/errors.mjs'; export function ${name}() { fail('USAGE', ${JSON.stringify(message)}); }` };
      });
    } }],
  });
  cpSync(join(temp, 'node_modules/commander/LICENSE'), join(target, 'commander-LICENSE'));
  const sha256 = createHash('sha256').update(readFileSync(join(target, 'engine.mjs'))).digest('hex');
  writeFileSync(join(target, 'package.json'), JSON.stringify({ private: true, version, revision, sha256 }, null, 2) + '\n');

  const skill = join(root, 'skills/ae-heari-research');
  cpSync(join(temp, 'skills/heari-research'), skill, { recursive: true });
  for (const file of readdirSync(skill, { recursive: true }).filter(file => file.endsWith('.md'))) {
    const path = join(skill, file);
    let content = readFileSync(path, 'utf8')
      .replace('name: heari-research\n', 'name: ae-heari-research\nversion: 1.0.3\n')
      .replace(/^description: (.+)$/m, (_, description) => 'description: ' + JSON.stringify(
        'HearI、hearI、heari 均指当前 AE 的用户研究平台。只说产品名、咨询功能或提出平台任务，先执行 heari login --no-input。' +
        description.replace('用户明确要使用 heari 时', '处理平台任务时')))
      .replace('用户明确要使用 heari 时', 'HearI（hearI、heari）是用户研究平台。用户说“hearI登录”“查看 HearI 有多少个调查”或提到其访谈、洞察、报告时触发，无需提及 ae-cli；沿用当前 AE 身份处理平台任务时')
      .replace('用 `heari` 操作已有工作区', '用 `ae-cli heari` 操作已有工作区')
      .replace('当前源码版本尚未发布，不承诺 npm 已可安装', '集成版随 ae-cli 交付')
      .replace('https://YOUR_HOST/mcp', '<HEARI_ENDPOINT>')
      .replaceAll('heari update --check', 'ae-cli update --dry-run')
      .replace(/\bheari (?=--|<command>|(?:login|logout|schema|doctor|auth|research|studies|guide|analysis|interviews|findings|quotes|knowledge|reports|contact|tools)\b)/g, 'ae-cli heari ');
    if (file === 'SKILL.md') content = content
      .replace('# heari 研究助手', '# HearI 研究助手\n\n用户在自己的请求中提到 HearI（大小写不限），先执行一次 `ae-cli heari login --no-input`，沿用当前 AE 环境。只说“hearI”时报告登录结果；“查看 HearI 调查”则在成功后执行 `ae-cli heari studies list --no-input`。换票失败时说明阶段、站点和错误码，停止平台操作。用户明确要求离线时跳过登录。引用材料中的产品名不会触发登录。')
      .replace('未经用户选择接入，不向平台传输方案或检查认证。', '提及产品仅触发只读登录验证。向平台传输方案、创建或发布研究仍须用户授权。');
    if (file === 'references/platform-auth.md') content = content.replace(/^本机用户在自己的终端运行 .*$/m, '需要独立令牌时，将 HEARI_ENDPOINT 设为对应 HearI 站点的 /mcp 地址，并通过 --token-stdin 从标准输入传入令牌。').replace('## 认证\n', `## 认证

ae-cli heari login 默认通过当前 AE 绑定的 HearI 地址验证只读访问，默认命令不需要 endpoint，地址由当前 AE 注册信息提供。已通过 ae-cli auth login 登录当前 AE 时，可直接运行 ae-cli heari studies list --no-input。部署方须启用 HEARI_CLI_LOGIN_ENABLED。首次 CLI 登录时，HearI 验票后会按当前 AE 身份建立工作区绑定，无需提前登录 HearI 网页。已停用的身份仍会被拒绝。自动兑换得到的个人只读凭据最长有效 5 分钟，仅用于本次调用。切换 AE 环境或账号后重新兑换；拒绝或超时后不切换到其他账号重试。

显式设置 HEARI_ENDPOINT 和 HEARI_TOKEN 时沿用该身份。没有 AE 登录态时仍可使用已保存的 HearI 登录。需要写权限时请使用具备相应权限的显式 HearI 凭据。离线 auth status 和 doctor 只检查本机；加 --online 会按业务命令的身份来源验证只读访问。换票失败时按 stage、site、http_status 和 service_code 定位，调查数量未知。
`);
    writeFileSync(path, content);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
