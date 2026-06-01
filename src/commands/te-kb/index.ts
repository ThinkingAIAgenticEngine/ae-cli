import type { Command } from '../../framework/types.js';
import { query } from './query.js';
import { add } from './add.js';
import { compile } from './compile.js';
import { remove } from './remove.js';
import { create } from './create.js';
import { rmSource } from './rm-source.js';
import { schema } from './schema.js';

const commands: Command[] = [
  query,
  add,
  compile,
  remove,
  create,
  rmSource,
  schema,
];

export default commands;
export { query, add, compile, remove, create, rmSource, schema };
