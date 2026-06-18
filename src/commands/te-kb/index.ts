import type { Command } from '../../framework/types.js';
import { query } from './query.js';
import { add } from './add.js';
import { compile } from './compile.js';
import { remove } from './remove.js';
import { create } from './create.js';
import { rmSource } from './rm-source.js';
import { schema } from './schema.js';
import { kbIndex } from './kb-index.js';
import { kbGrep } from './kb-grep.js';
import { kbRead } from './kb-read.js';

const commands: Command[] = [
  query,
  add,
  compile,
  remove,
  create,
  rmSource,
  schema,
  kbIndex,
  kbGrep,
  kbRead,
];

export default commands;
export { query, add, compile, remove, create, rmSource, schema, kbIndex, kbGrep, kbRead };
