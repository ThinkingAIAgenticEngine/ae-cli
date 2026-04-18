import type { Command } from '../../../framework/types.js';

// repo commands
import { listCatalogs } from './list-catalogs.js';
import { listSchemas } from './list-schemas.js';
import { listRepos } from './list-repos.js';
import { addSpaceMember } from './add-space-member.js';
import { listSpaceMembers } from './list-space-members.js';
import { previewParamExpression } from './preview-param-expression.js';
import { listParamUsedFlows } from './list-param-used-flows.js';
import { listSupportParams } from './list-support-params.js';
import { listSpaces } from './list-spaces.js';

const commands: Command[] = [
  listCatalogs,
  listSchemas,
  listRepos,
  addSpaceMember,
  listSpaceMembers,
  previewParamExpression,
  listParamUsedFlows,
  listSupportParams,
  listSpaces,
];

export default commands;