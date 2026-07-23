import assert from 'node:assert/strict';
import { Command } from 'commander';
import { parseProgram } from '../src/framework/program-lifecycle.ts';

let completed = false;
const program = new Command();
program.command('wait').action(async () => {
  await new Promise<void>((resolve) => setImmediate(resolve));
  completed = true;
});

await parseProgram(program, ['node', 'ae-cli', 'wait']);

assert.equal(completed, true, 'CLI parsing must await asynchronous command actions');
process.stdout.write('program lifecycle tests: 1 passed\n');
