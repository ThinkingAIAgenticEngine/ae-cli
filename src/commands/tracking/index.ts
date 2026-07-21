import type { Command } from 'commander';
import { registerPlan } from './plan.js';
import { registerCode } from './code.js';
import { registerWiki } from './wiki.js';
// import { registerDebug } from './debug.js';
// import { registerInit } from './init.js';
import { registerLang } from './lang.js';

export function registerTracking(program: Command): void {
  const tracking = getOrCreateCommand(program, 'tracking', 'AE tracking plan lifecycle (xlsx, debug, wiki)');

  registerPlan(getOrCreateCommand(tracking, 'plan', 'manage AE tracking plans'), program);
  registerCode(getOrCreateCommand(tracking, 'code', 'tracking code commands'));
  registerWiki(getOrCreateCommand(tracking, 'wiki', 'tracking wiki commands'));
  // registerDebug(getOrCreateCommand(tracking, 'debug', 'tracking debug commands'), program);
  // registerInit(getOrCreateCommand(tracking, 'init', 'tracking init commands'));
  registerLang(getOrCreateCommand(tracking, 'lang', 'tracking language commands'), program);
}

function getOrCreateCommand(parent: Command, name: string, description: string): Command {
  const existing = parent.commands.find((command) => command.name() === name);
  if (existing) {
    existing.description(description);
    return existing;
  }
  return parent.command(name).description(description);
}
