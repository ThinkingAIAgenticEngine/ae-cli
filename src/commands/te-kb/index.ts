import type { Command } from '../../framework/types.js';
import { add } from './add.js';
import { compile } from './compile.js';
import { remove } from './remove.js';
import { create } from './create.js';
import { rmSource } from './rm-source.js';
import { schema } from './schema.js';
import { status } from './status.js';
import { kbIndex } from './kb-index.js';
import { kbList } from './kb-list.js';
import { kbGrep } from './kb-grep.js';
import { kbRead } from './kb-read.js';
import { ask } from './ask.js';
import { askStatus } from './ask-status.js';
import { url } from './url.js';

const commands: Command[] = [
  ask,
  askStatus,
  add,
  url,
  compile,
  remove,
  create,
  rmSource,
  schema,
  status,
  kbList,
  kbIndex,
  kbGrep,
  kbRead,
];

export default commands;
export { ask, askStatus, add, url, compile, remove, create, rmSource, schema, status, kbList, kbIndex, kbGrep, kbRead };
