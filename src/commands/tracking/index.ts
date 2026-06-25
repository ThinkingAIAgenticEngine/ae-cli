import type { Command } from 'commander';
import { registerPlan } from './plan.js';
import { registerCode } from './code.js';
import { registerWiki } from './wiki.js';
// import { registerDebug } from './debug.js';
// import { registerInit } from './init.js';
import { registerLang } from './lang.js';

export function registerTracking(program: Command): void {
  const tracking = program
    .command('tracking')
    .description('AE tracking plan lifecycle (xlsx, debug, wiki)');

  registerPlan(tracking.command('plan'), program);
  registerCode(tracking.command('code'));
  registerWiki(tracking.command('wiki'));
  // registerDebug(tracking.command('debug'), program);
  // registerInit(tracking.command('init'));
  registerLang(tracking.command('lang'), program);
}
