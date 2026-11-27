#!/usr/bin/env node
import { readFileSync } from 'node:fs';
if (Number(process.versions.node.split('.')[0]) < 20) {
  console.error('AE CLI requires Node.js 20 or later. Select a supported Node.js runtime and rerun.');
  process.exitCode = 1;
} else if (process.argv.length === 3 && process.argv[2] === '--runtime-capabilities') {
  // Keep discovery independent of application imports and credential initialization.
  const capabilities = JSON.parse(readFileSync(new URL('./runtime-capabilities.json', import.meta.url), 'utf8'));
  process.stdout.write(JSON.stringify(capabilities) + '\n');
} else {
  await import('../dist/index.js');
}
