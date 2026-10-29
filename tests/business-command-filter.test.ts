import assert from 'node:assert/strict';
import { Command, CommanderError } from 'commander';
import test from 'node:test';
import { configureBusinessCommands } from '../src/framework/business-filter.js';
import { BusinessDisabledError } from '../src/core/business-config.js';
import type { BusinessStates } from '../src/core/businesses.js';

function fixture(states: BusinessStates) {
  let output = '';
  const program = new Command().name('ae-cli').option('--host <url>').exitOverride();
  program.configureOutput({ writeOut: (text) => { output += text; }, writeErr: (text) => { output += text; } });
  let actions = 0;
  const disabled = program.command('agent');
  disabled.command('list').action(() => { actions += 1; }).addHelpText('after', 'Agent-only instructions');
  program.command('sync').action(() => { actions += 1; });
  const system = program.command('system');
  system.command('member').command('list').action(() => { actions += 1; });
  system.command('+list-members').action(() => { actions += 1; });
  system.command('channel').command('binding').command('list').action(() => { actions += 1; });
  program.command('analysis').command('list').action(() => { actions += 1; });
  program.command('auth').command('login').action(() => { actions += 1; });
  program.command('legacy', { hidden: true }).action(() => { actions += 1; });
  const checkedHosts: Array<string | undefined> = [];
  configureBusinessCommands(program, {
    readStates: () => states,
    assertEnabled: async (business, host) => {
      checkedHosts.push(host);
      if (business && states[business] === false) throw new BusinessDisabledError(business);
    },
  });
  return { program, checkedHosts, output: () => output, actions: () => actions };
}

async function help(args: string[]) {
  const result = fixture({ agent: false });
  try { await result.program.parseAsync(['node', 'ae-cli', ...args]); }
  catch (error) {
    if (!(error instanceof CommanderError) || !['commander.helpDisplayed', 'commander.help'].includes(error.code)) throw error;
  }
  assert.equal(result.checkedHosts.length, 0, 'help must not execute remote availability checks');
  return result.output();
}

test('root help hides optional roots without unregistering them or exposing legacy commands', async () => {
  const text = await help(['--help']);
  assert.match(text, /analysis/);
  assert.match(text, /auth/);
  assert.doesNotMatch(text, /agent\s/);
  assert.doesNotMatch(text, /sync\s/);
  assert.doesNotMatch(text, /legacy/);
  assert.ok(fixture({ agent: false }).program.commands.find((command) => command.name() === 'agent'));
});

test('subcommand help and help command both retain analysis system leaves and hide Agent leaves', async () => {
  for (const args of [['system', '--help'], ['system', '-h'], ['help', 'system']]) {
    const text = await help(args);
    assert.match(text, /member/);
    assert.doesNotMatch(text, /\+list-members/);
    assert.doesNotMatch(text, /channel/);
  }
});

test('direct help for a closed command explains availability without its instructions', async () => {
  for (const args of [['agent', '--help'], ['help', 'agent'], ['agent', 'list', '--help'], ['system', 'channel', '--help']]) {
    const text = await help(args);
    assert.match(text, /business is not enabled/);
    assert.doesNotMatch(text, /Commands:/);
    assert.doesNotMatch(text, /Agent-only instructions/);
  }
});

test('explicit execution blocks disabled declarative and direct Commander commands before the action', async () => {
  for (const args of [['agent', 'list'], ['sync'], ['system', '+list-members'], ['system', 'channel', 'binding', 'list']]) {
    const result = fixture({ agent: false });
    await assert.rejects(result.program.parseAsync(['node', 'ae-cli', ...args]), BusinessDisabledError);
    assert.equal(result.actions(), 0);
  }
});

test('analysis, recovery and unknown business states remain executable', async () => {
  for (const [states, args] of [
    [{ agent: false }, ['system', 'member', 'list']],
    [{ agent: false }, ['analysis', 'list']],
    [{ agent: false }, ['auth', 'login']],
    [{}, ['agent', 'list']],
  ] as Array<[BusinessStates, string[]]>) {
    const result = fixture(states);
    await result.program.parseAsync(['node', 'ae-cli', ...args]);
    assert.equal(result.actions(), 1);
  }
});

test('execution availability receives the selected host override', async () => {
  const result = fixture({ agent: true });
  await result.program.parseAsync(['node', 'ae-cli', '--host', 'https://other.example', 'agent', 'list']);
  assert.deepEqual(result.checkedHosts, ['https://other.example']);
});
