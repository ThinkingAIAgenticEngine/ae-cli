#!/usr/bin/env node
/**
 * te-cli self-check scanner
 *
 * 多维度检测「新合并的 CLI 功能是否合理」。纯 Node（无新依赖），可重复执行。
 *
 * 用法：
 *   node self-check/scan.mjs                # 全量扫描
 *   node self-check/scan.mjs --since master # 聚焦相对 master 新增/改动的命令模块
 *   node self-check/scan.mjs --json         # 机器可读输出
 *
 * 退出码：0 = 无 P1/P2；1 = 存在 P1（阻断性）问题。
 *
 * 检测维度（见 SKILL.md）：
 *   D1 命令注册完整性     —— 新域是否在 src/index.ts 注册；MCP 域是否注册 mapping
 *   D2 业务域 ↔ skill 配对 —— 每个业务域是否有对应 skill；工具命令不应有
 *   D3 skill 文档覆盖      —— 命令 ↔ references/*.md 双向 diff（命名归一化）
 *   D4 skill 内部一致性    —— CRITICAL「+cmd→cmd.md」规则 vs 真实文件；链接失效
 *   D5 文档同步           —— README 是否覆盖所有域/命令；CHANGELOG/版本
 *   D6 工程健壮性         —— verify 脚本覆盖；typecheck 是否接入
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SINCE = (() => {
  const i = args.indexOf('--since');
  return i >= 0 ? args[i + 1] : null;
})();
const JSON_OUT = args.includes('--json');

// ---------- 配置：业务域 → skill 映射 ----------
// 多个 te-* 命令目录可映射到同一个 skill（analysis 系列即如此）。
const DOMAIN_TO_SKILL = {
  'te-analysis': 'ae-analysis',
  'te-meta': 'ae-analysis',
  'te-audience': 'ae-analysis',
  'te-common': 'ae-analysis',
  'te-engage': 'ae-engage',
  'te-dataops': 'ae-dataops',
  'te-community': 'ae-community',
  'te-kb': 'ae-kb',
  'te-team': 'ae-team',
  'te-agent': 'ae-agent',
};
// 工具命令目录（不应有 skill，交互式/运维用途）。
const TOOL_DIRS = new Set(['sync', 'model']);
// 采用「分组/内联文档」而非「逐命令 reference」策略的 skill：不对其报逐命令缺失。
const GROUPED_DOC_SKILLS = new Set(['ae-dataops', 'ae-kb']);

// ---------- 结果收集 ----------
const findings = []; // { level: 'P1'|'P2'|'P3'|'info', dim, msg }
function add(level, dim, msg) { findings.push({ level, dim, msg }); }

// ---------- 工具函数 ----------
function read(p) { try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; } }
function exists(p) { return fs.existsSync(p); }
function listDir(p) { try { return fs.readdirSync(p); } catch { return []; } }
function walk(dir, out = []) {
  for (const e of listDir(dir)) {
    const fp = path.join(dir, e);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, out);
    else out.push(fp);
  }
  return out;
}
// 命名归一化：统一下划线/连字符，用于跨命名风格比对（engage 下划线 vs reference 连字符）。
const norm = (s) => s.replace(/[_-]/g, '').toLowerCase();

// ---------- 扫描命令源码 ----------
// 返回 { domainDir -> { commands: [{name, risk, file}], services: Set } }
function scanCommands() {
  const commandsRoot = path.join(ROOT, 'src/commands');
  const domains = {};
  for (const dir of listDir(commandsRoot)) {
    const dpath = path.join(commandsRoot, dir);
    if (!fs.statSync(dpath).isDirectory()) continue;
    const files = walk(dpath).filter((f) => f.endsWith('.ts'));
    const commands = [];
    const services = new Set();
    for (const f of files) {
      const c = read(f);
      const cmdMatches = [...c.matchAll(/command:\s*'\+([a-z0-9_-]+)'/g)];
      const svcMatches = [...c.matchAll(/service:\s*'([a-z0-9_]+)'/g)];
      for (const m of svcMatches) services.add(m[1]);
      for (const m of cmdMatches) {
        const riskMatch = c.match(/risk:\s*'(read|write)'/);
        commands.push({ name: m[1], risk: riskMatch ? riskMatch[1] : null, file: f });
      }
    }
    domains[dir] = { commands, services, files };
  }
  return domains;
}

// ---------- 找出变更的域（--since 模式）----------
function changedDomains() {
  if (!SINCE) return null;
  let out = '';
  try {
    out = execSync(`git diff --name-only ${SINCE}...HEAD -- src/commands skills README.md README.zh.md`, {
      cwd: ROOT, encoding: 'utf-8',
    });
  } catch (e) {
    add('info', 'D0', `git diff --since ${SINCE} 失败：${e.message.split('\n')[0]}（退回全量扫描）`);
    return null;
  }
  const dirs = new Set();
  for (const line of out.split('\n')) {
    const m = line.match(/^src\/commands\/([^/]+)\//) || line.match(/^skills\/([^/]+)\//);
    if (m) dirs.add(m[1]);
  }
  return dirs;
}

// 收集全局已注册的 MCP mapping key：内置(mcp.ts) + 各域 registerMcpMapping(s)。
function collectRegisteredMcpKeys() {
  const keys = new Set();
  const mcpCore = read(path.join(ROOT, 'src/core/mcp.ts'));
  // 内置：registerMcpMapping('analysis', {...})
  for (const m of mcpCore.matchAll(/registerMcpMapping\(\s*'([a-z0-9_]+)'/g)) keys.add(m[1]);
  // 各处：registerMcpMapping('x' 与 registerMcpMappings({ 'x': { componentName ... } })
  for (const f of walk(path.join(ROOT, 'src'))) {
    if (!f.endsWith('.ts')) continue;
    const c = read(f);
    for (const m of c.matchAll(/registerMcpMapping\(\s*'([a-z0-9_]+)'/g)) keys.add(m[1]);
    // registerMcpMappings 对象内的每个 key（以 componentName 出现为锚点）
    for (const m of c.matchAll(/'([a-z0-9_]+)'\s*:\s*\{\s*componentName/g)) keys.add(m[1]);
  }
  return keys;
}

// 从一个域的源码里，静态提取真正用于 MCP 路由的 service name（仅字面量，变量传参不强求）。
function extractUsedMcpServices(info) {
  const used = new Set();
  for (const f of info.files) {
    const c = read(f);
    // createMcpCommand({ mcpService: 'X' }) 显式值
    for (const m of c.matchAll(/mcpService:\s*'([a-z0-9_]+)'/g)) used.add(m[1]);
    // shared.ts 工厂默认值：const mcpService = config.mcpService || 'X'
    for (const m of c.matchAll(/mcpService\s*\|\|\s*'([a-z0-9_]+)'/g)) used.add(m[1]);
    // resolveMcpUrl(ctx.mcpUrl(), host, 'X') 直接字面量
    for (const m of c.matchAll(/resolveMcpUrl\([^,]+,[^,]+,\s*'([a-z0-9_]+)'\s*\)/g)) used.add(m[1]);
  }
  return used;
}

// ====================================================================
// D1：命令注册完整性
// ====================================================================
function checkRegistration(domains) {
  const indexTs = read(path.join(ROOT, 'src/index.ts'));
  const registered = collectRegisteredMcpKeys();

  for (const [dir, info] of Object.entries(domains)) {
    if (info.commands.length === 0 && !TOOL_DIRS.has(dir)) continue;

    // 1a. index.ts 是否 import 了该域（域 index.js 或工具命令注册）
    const imported = indexTs.includes(`./commands/${dir}/index.js`) ||
                     indexTs.includes(`./commands/${dir}/`);
    if (!imported) {
      add('P1', 'D1', `域 '${dir}' 未在 src/index.ts 注册 —— 命令不会被加载`);
    }

    // 1b. 该域真正路由用到的 MCP service（字面量）是否都已注册 mapping。
    //     注意：用的是路由层 service name（如 engage_config），而非 commander 分组名（engage）。
    //     变量传参的 service 无法静态提取，宁可漏报不误报。
    const used = extractUsedMcpServices(info);
    for (const svc of used) {
      if (!registered.has(svc)) {
        add('P1', 'D1', `MCP service '${svc}'（域 ${dir}）未注册 mapping —— buildMcpUrl 会抛错。请在域 index.ts 调 registerMcpMappings`);
      }
    }
  }
}

// ====================================================================
// D2：业务域 ↔ skill 配对
// ====================================================================
function checkPairing(domains, focus) {
  const skillsRoot = path.join(ROOT, 'skills');
  for (const [dir, info] of Object.entries(domains)) {
    if (focus && !focus.has(dir)) continue;
    if (info.commands.length === 0) {
      if (TOOL_DIRS.has(dir)) add('info', 'D2', `工具命令 '${dir}' 无 skill（符合约定）`);
      continue;
    }
    const skill = DOMAIN_TO_SKILL[dir];
    if (!skill) {
      add('P2', 'D2', `业务域 '${dir}'（${info.commands.length} 命令）未配置 skill 映射 —— 请确认是否应有对应 skill`);
      continue;
    }
    if (!exists(path.join(skillsRoot, skill, 'SKILL.md'))) {
      add('P1', 'D2', `业务域 '${dir}' 指向的 skill '${skill}' 不存在`);
    }
  }
}

// ====================================================================
// D3 + D4：skill 文档覆盖 & 内部一致性
// ====================================================================
function checkSkills(domains, focus) {
  const skillsRoot = path.join(ROOT, 'skills');
  // 反向聚合：skill -> 该 skill 覆盖的所有命令
  const skillCmds = {};
  for (const [dir, info] of Object.entries(domains)) {
    const skill = DOMAIN_TO_SKILL[dir];
    if (!skill) continue;
    (skillCmds[skill] ||= []).push(...info.commands.map((c) => c.name));
  }

  for (const skill of listDir(skillsRoot)) {
    const sdir = path.join(skillsRoot, skill);
    if (!fs.statSync(sdir).isDirectory()) continue;
    const skillMd = read(path.join(sdir, 'SKILL.md'));
    if (!skillMd) { add('P2', 'D4', `skill '${skill}' 缺少 SKILL.md`); continue; }

    const refFiles = listDir(path.join(sdir, 'references')).filter((f) => f.endsWith('.md'));
    const refNames = refFiles.map((f) => f.replace(/\.md$/, ''));
    const cmds = skillCmds[skill] || [];

    // D3: 命令 → reference 覆盖（仅对逐命令文档型 skill）
    // 用归一化匹配判断「是否存在对应文档」（create-team.md 可覆盖 +create）。
    // 命名风格不一致本身不在 D3 报，交由 D4 的严格规则检查处理，避免重复告警。
    if (!GROUPED_DOC_SKILLS.has(skill) && cmds.length > 0) {
      if (refNames.length === 0) {
        add('P3', 'D3', `skill '${skill}' 无 references/ 目录，${cmds.length} 个命令文档全内联（与逐命令文档型 skill 风格不一致）`);
      } else {
        const refSet = new Set(refNames.map(norm));
        // 归一化后仍完全找不到任何对应文档，才算真·缺失
        const missing = cmds.filter((c) => {
          const n = norm(c);
          return ![...refSet].some((r) => r === n || r.includes(n) || n.includes(r));
        });
        if (missing.length) {
          add('P2', 'D3', `skill '${skill}' 缺命令文档：${missing.map((c) => '+' + c).join(', ')}`);
        }
      }
    }

    // D4a: CRITICAL「filename = command name (去掉+)」规则一致性
    const declaresExactRule = /reference filename equals the command name|references\/<command>\.md|references\/<tool_name>\.md/i.test(skillMd);
    if (declaresExactRule && refNames.length > 0) {
      const refExact = new Set(refNames); // 不归一化，严格按规则
      const violators = cmds.filter((c) => !refExact.has(c));
      if (violators.length) {
        add('P1', 'D4',
          `skill '${skill}' 顶部声明「+cmd → references/<cmd>.md」，但以下命令按此规则找不到文件：` +
          violators.map((c) => `+${c}→${c}.md`).join(', ') +
          `（实际文件名不一致，agent 会读空，导致瞎猜参数）`);
      }
    }

    // D4b: SKILL.md 内引用的 references/*.md 链接是否都指向真实文件
    const linked = [...skillMd.matchAll(/references\/([a-z0-9_-]+)\.md/gi)].map((m) => m[1]);
    const refOnDisk = new Set(refNames);
    const deadLinks = [...new Set(linked)].filter((l) => !refOnDisk.has(l));
    if (deadLinks.length) {
      add('P2', 'D4', `skill '${skill}' 存在失效文档链接：${deadLinks.map((l) => 'references/' + l + '.md').join(', ')}`);
    }

    // D4c: frontmatter 基本字段
    if (!/^---[\s\S]*?name:\s*\S+[\s\S]*?description:\s*\S+[\s\S]*?---/m.test(skillMd)) {
      add('P3', 'D4', `skill '${skill}' 的 SKILL.md frontmatter 缺 name/description`);
    }
  }
}

// ====================================================================
// D5：文档同步（README / CHANGELOG / 版本）
// ====================================================================
function checkDocs(domains) {
  const readme = read(path.join(ROOT, 'README.md'));
  const readmeZh = read(path.join(ROOT, 'README.zh.md'));

  for (const [dir, info] of Object.entries(domains)) {
    if (info.commands.length === 0) continue;
    // 用 service 名在 README 命令表中查找
    for (const svc of info.services) {
      const inEn = readme.includes(svc);
      const inZh = readmeZh.includes(svc);
      if (!inEn && !inZh) {
        add('P2', 'D5', `service '${svc}'（域 ${dir}）未出现在任一 README —— 用户文档滞后`);
      }
    }
  }

  // 版本一致性
  const pkg = JSON.parse(read(path.join(ROOT, 'package.json')) || '{}');
  const changelog = read(path.join(ROOT, 'CHANGELOG.md'));
  if (pkg.version && changelog && !changelog.includes(pkg.version)) {
    add('P3', 'D5', `package.json 版本 ${pkg.version} 未出现在 CHANGELOG.md`);
  }
}

// ====================================================================
// D6：工程健壮性（verify 脚本覆盖 / typecheck）
// ====================================================================
function checkEngineering(domains) {
  const pkg = JSON.parse(read(path.join(ROOT, 'package.json')) || '{}');
  const scripts = pkg.scripts || {};
  const verifyTargets = Object.keys(scripts).filter((k) => k.startsWith('verify:')).join(' ');

  // 哪些域有 verify 覆盖（粗粒度：脚本名或脚本内容提及域关键字）
  const scriptsDir = path.join(ROOT, 'scripts');
  const scriptBlob = walk(scriptsDir).map(read).join('\n');
  for (const [dir, info] of Object.entries(domains)) {
    if (info.commands.length === 0) continue;
    const key = dir.replace(/^te-/, '');
    const covered = scriptBlob.includes(`te-${key}`) || verifyTargets.includes(key);
    if (!covered) {
      add('P3', 'D6', `域 '${dir}'（${info.commands.length} 命令）无对应 verify 脚本`);
    }
  }

  if (!Object.values(scripts).some((s) => /tsc\s+--noEmit|tsc -p|typecheck/.test(s))) {
    add('P3', 'D6', `package.json 未接入类型检查（tsc --noEmit）—— 类型错误仅在 build 暴露`);
  }
}

// ====================================================================
// 主流程
// ====================================================================
const domains = scanCommands();
const focus = changedDomains();

checkRegistration(domains);
checkPairing(domains, focus);
checkSkills(domains, focus);
checkDocs(domains);
checkEngineering(domains);

// ---------- 输出 ----------
const order = { P1: 0, P2: 1, P3: 2, info: 3 };
findings.sort((a, b) => (order[a.level] - order[b.level]) || a.dim.localeCompare(b.dim));

if (JSON_OUT) {
  console.log(JSON.stringify({ since: SINCE, focus: focus ? [...focus] : null, findings }, null, 2));
} else {
  const icon = { P1: '🔴', P2: '🟡', P3: '🟢', info: 'ℹ️ ' };
  const dimName = {
    D0: '扫描', D1: '命令注册', D2: '域↔skill配对', D3: 'skill文档覆盖',
    D4: 'skill一致性', D5: '文档同步', D6: '工程健壮性',
  };
  console.log(`\n  te-cli self-check  ${SINCE ? `(--since ${SINCE}, 聚焦: ${[...focus].join(',') || '无变更命令域'})` : '(全量)'}\n`);
  const counts = { P1: 0, P2: 0, P3: 0, info: 0 };
  for (const f of findings) counts[f.level]++;
  if (findings.length === 0) {
    console.log('  ✅ 未发现问题\n');
  } else {
    for (const f of findings) {
      console.log(`  ${icon[f.level]} [${f.level}] ${f.dim} ${dimName[f.dim] || ''}: ${f.msg}`);
    }
    console.log(`\n  汇总：🔴 P1=${counts.P1}  🟡 P2=${counts.P2}  🟢 P3=${counts.P3}  ℹ️ info=${counts.info}\n`);
  }
}

process.exit(findings.some((f) => f.level === 'P1') ? 1 : 0);
