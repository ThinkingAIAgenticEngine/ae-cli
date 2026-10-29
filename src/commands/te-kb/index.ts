import { projectTargetGet } from './project-target.js';
export { projectTargetGet } from './project-target.js';
import { publicationCommands } from './publication.js';
export * from './publication.js';
import { sourceCheckUrlUpdates } from "./source-check-url-updates.js";
import { schemaImportCommands } from "./schema-import.js";
export * from "./schema-import.js";
import { sourceCheckUpdates } from './source-check-updates.js';
import { sourceCreateText, sourceReadText } from './source-text.js';
import { sourceReplace, sourceRestore, sourcePreview, sourceCommit, sourceCancel } from './source-mutation.js';
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
import { listSources } from './list-sources.js';
import { usageList } from './usage-list.js';
import { kbGrep } from './kb-grep.js';
import { kbRead } from './kb-read.js';
import { ask } from './ask.js';
import { askStatus } from './ask-status.js';
import { url } from './url.js';
import { importSnapshot } from './import.js';
import { importStatus } from './import-status.js';
import { sourceLs, sourceRead, sourcePut, sourceRm } from './source-directory.js';

import { versions, versionShow, versionSources, versionDiff, versionTree, versionRead, versionDownload, rollback, rollbackStatus } from './version-management.js';

const commands: Command[] = [
  projectTargetGet,
  ...publicationCommands,
  usageList,
  ...schemaImportCommands,
  sourceCheckUpdates,
  sourceCheckUrlUpdates,
  sourceCreateText, sourceReadText,
  sourceReplace, sourceRestore, sourcePreview, sourceCommit, sourceCancel,
  versions, versionShow, versionSources, versionDiff, versionTree, versionRead, versionDownload, rollback, rollbackStatus,
  sourceLs, sourceRead, sourcePut, sourceRm,
  ask,
  askStatus,
  add,
  url,
  compile,
  remove,
  create,
  listSources,
  rmSource,
  schema,
  status,
  kbList,
  kbIndex,
  kbGrep,
  kbRead,
  importSnapshot,
  importStatus,
];

export default commands;
export { usageList };
export { sourceLs, sourceRead, sourcePut, sourceRm };
export { ask, askStatus, add, url, compile, remove, create, rmSource, schema, status, kbList, kbIndex, kbGrep, kbRead, importSnapshot, importStatus, listSources };

export { versions, versionShow, versionSources, versionDiff, versionTree, versionRead, versionDownload, rollback, rollbackStatus };

export { sourceReplace, sourceRestore, sourcePreview, sourceCommit, sourceCancel };

export { sourceCheckUpdates };

export { sourceCheckUrlUpdates };
export { sourceCreateText, sourceReadText };
