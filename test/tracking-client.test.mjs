import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

function test(name, fn) {
  fn();
  console.log(`  OK: ${name}`);
}

console.log('tracking-client source tests');

test('tracking-client exposes saveUserAutoConfig and getServerLang', () => {
  const src = readFileSync(path.join(ROOT, 'src/core/tracking-client.ts'), 'utf8');
  assert.match(src, /saveUserAutoConfig/);
  assert.match(src, /getServerLang/);
  assert.match(src, /saveUserAutoConfig/);
  assert.match(src, /form\.append\('lang'/);
  assert.doesNotMatch(src, /readUmilocal|writeUmilocale|localStorage/);
});

test('plan upload uses API language check not localStorage', () => {
  const src = readFileSync(path.join(ROOT, 'src/commands/tracking/plan.ts'), 'utf8');
  assert.match(src, /getServerLang/);
  assert.match(src, /saveUserAutoConfig/);
  assert.doesNotMatch(src, /readUmilocal|writeUmilocale|setAELang/);
});

test('paths use .ae-cli project dir', () => {
  const src = readFileSync(path.join(ROOT, 'src/tracking/paths.ts'), 'utf8');
  assert.match(src, /\.ae-cli/);
});

test('shared exports path validation helpers', () => {
  const src = readFileSync(path.join(ROOT, 'src/commands/tracking/shared.ts'), 'utf8');
  assert.match(src, /assertOutputFilePath/);
  assert.match(src, /assertInputFilePath/);
});

console.log('All tracking-client source tests passed.');
