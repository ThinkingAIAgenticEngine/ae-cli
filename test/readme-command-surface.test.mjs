import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README_FILES = [
  'README.md',
  'README.zh.md',
  'open-source/README.opensource.md',
  'open-source/README.opensource.zh.md',
];
const START_MARKER = '<!-- root-command-surface:start -->';
const END_MARKER = '<!-- root-command-surface:end -->';

function rootCommandsFromHelp() {
  const tsxCli = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const output = execFileSync(
    process.execPath,
    [tsxCli, path.join(ROOT, 'src', 'index.ts'), '--no-update-check', '--help'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    },
  );
  const commandsBlock = output.split('\nCommands:\n')[1];
  assert.ok(commandsBlock, 'root help must include a Commands section');
  return commandsBlock
    .split('\n')
    .map((line) => line.match(/^  ([a-z0-9][a-z0-9_-]*)(?:\s|\[)/)?.[1])
    .filter((command) => command && command !== 'help')
    .sort();
}

function documentedRootCommands(file) {
  const content = readFileSync(path.join(ROOT, file), 'utf8');
  const start = content.indexOf(START_MARKER);
  const end = content.indexOf(END_MARKER);
  assert.ok(start >= 0 && end > start, `${file} must contain the root-command table markers`);
  const block = content.slice(start + START_MARKER.length, end);
  const commands = block
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .flatMap((line) => {
      const commandCell = line.split('|')[2] ?? '';
      return [...commandCell.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    });
  assert.equal(new Set(commands).size, commands.length, `${file} must list each root command exactly once`);
  return commands.sort();
}

test('all READMEs list the complete runtime root-command surface', () => {
  const actualCommands = rootCommandsFromHelp();
  for (const file of README_FILES) {
    assert.deepEqual(documentedRootCommands(file), actualCommands, `${file} is out of sync with ae-cli --help`);
  }
});
