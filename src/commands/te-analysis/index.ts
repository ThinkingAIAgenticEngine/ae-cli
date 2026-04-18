import type { Command } from '../../framework/types.js';
import meta from './meta/index.js';
import report from './report/index.js';
import dashboard from './dashboard/index.js';
import model from './model/index.js';
import entity from './entity/index.js';
import schema from './schema/index.js';

const commands: Command[] = [
  ...meta,
  ...report,
  ...dashboard,
  ...model,
  ...entity,
  ...schema,
];

export default commands;
