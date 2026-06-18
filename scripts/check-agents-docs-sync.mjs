#!/usr/bin/env node
// 校验 CLAUDE.md 与 AGENTS.md 内容逐字一致，防止两份 agent 指南漂移。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['CLAUDE.md', 'AGENTS.md'];

const contents = files.map((f) => {
  try {
    return { f, text: readFileSync(path.join(root, f), 'utf8') };
  } catch (err) {
    console.error(`✗ 无法读取 ${f}: ${err.message}`);
    process.exit(1);
  }
});

const [a, b] = contents;
if (a.text === b.text) {
  console.log('✓ CLAUDE.md 与 AGENTS.md 内容一致');
  process.exit(0);
}

const aLines = a.text.split('\n');
const bLines = b.text.split('\n');
const max = Math.max(aLines.length, bLines.length);
let line = -1;
for (let i = 0; i < max; i += 1) {
  if (aLines[i] !== bLines[i]) {
    line = i + 1;
    break;
  }
}

console.error(`✗ CLAUDE.md 与 AGENTS.md 不一致（首个差异在第 ${line} 行）`);
console.error('  请同步两份文件后重试（把正本复制到另一份即可）。');
process.exit(1);
