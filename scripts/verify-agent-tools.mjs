#!/usr/bin/env node

/**
 * verify-agent-tools.mjs
 *
 * 验证 src/commands/te-agent/ 目录下的所有命令：
 * 1. 扫描 .ts 文件，正则提取 command name
 * 2. 去重检查
 * 3. 数量检查（EXPECTED_COUNT = 15）
 * 4. 运行 ae-cli agent --help 并验证所有命令名出现
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';

const AGENT_DIR = 'src/commands/te-agent';
const EXPECTED_COUNT = 15;
const SERVICE = 'agent';

let failed = false;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

// ─── Step 1: 扫描命令文件 ────────────────────────────────────

function scanCommands(dir) {
  const commands = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      commands.push(...scanCommands(full));
      continue;
    }
    if (!entry.endsWith('.ts') || entry === 'index.ts') continue;

    const content = readFileSync(full, 'utf8');
    const re = /command:\s*'(\+[a-z][a-z0-9-]*)'/g;
    let match;
    while ((match = re.exec(content)) !== null) {
      commands.push({ name: match[1], file: full });
    }
  }
  return commands;
}

const commands = scanCommands(AGENT_DIR);
ok(`扫描到 ${commands.length} 个命令`);

// ─── Step 2: 去重检查 ────────────────────────────────────────

const names = commands.map((c) => c.name);
const uniqueNames = new Set(names);
if (uniqueNames.size !== names.length) {
  const seen = new Set();
  for (const n of names) {
    if (seen.has(n)) fail(`重复命令名：${n}`);
    seen.add(n);
  }
} else {
  ok('无重复命令名');
}

// ─── Step 3: 数量检查 ────────────────────────────────────────

if (uniqueNames.size !== EXPECTED_COUNT) {
  fail(`期望 ${EXPECTED_COUNT} 个命令，实际 ${uniqueNames.size} 个`);
} else {
  ok(`命令数量 ${uniqueNames.size} = ${EXPECTED_COUNT}`);
}

// ─── Step 4: --help 输出验证 ─────────────────────────────────

try {
  const helpOutput = execSync(`npx tsx src/index.ts ${SERVICE} --help`, {
    encoding: 'utf8',
    timeout: 30000,
  });

  let allFound = true;
  for (const name of uniqueNames) {
    if (!helpOutput.includes(name)) {
      fail(`--help 输出中缺少命令：${name}`);
      allFound = false;
    }
  }
  if (allFound) {
    ok(`--help 输出包含全部 ${uniqueNames.size} 个命令`);
  }
} catch (err) {
  fail(`运行 --help 失败：${err.message}`);
}

// ─── 汇总 ────────────────────────────────────────────────────

if (failed) {
  console.error('\n✗ 验证失败');
  process.exit(1);
} else {
  console.log(`\n✓ 全部通过（${uniqueNames.size} 个命令）`);
}
