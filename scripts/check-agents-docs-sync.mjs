#!/usr/bin/env node
// Verify that CLAUDE.md and AGENTS.md are character-for-character identical, preventing drift between the two agent guides.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['CLAUDE.md', 'AGENTS.md'];

const contents = files.map((f) => {
  try {
    return { f, text: readFileSync(path.join(root, f), 'utf8') };
  } catch (err) {
    console.error(`✗ Cannot read ${f}: ${err.message}`);
    process.exit(1);
  }
});

const [a, b] = contents;
if (a.text === b.text) {
  console.log('✓ CLAUDE.md and AGENTS.md are identical');
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

console.error(`✗ CLAUDE.md and AGENTS.md differ (first difference at line ${line})`);
console.error('  Please sync the two files and retry (copy the authoritative version over the other).');
process.exit(1);
