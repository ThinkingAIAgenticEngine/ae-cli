#!/usr/bin/env node
if (Number(process.versions.node.split('.')[0]) < 20) {
  console.error('AE CLI requires Node.js 20 or later. Select a supported Node.js runtime and rerun.');
  process.exitCode = 1;
} else {
  await import('../dist/index.js');
}
