import type { Command } from '../../../framework/types.js';
import { createAnalysisCapabilityCommand, projectIdFlag } from '../capability-shared.js';

export const inputFilePurposeList: Command = createAnalysisCapabilityCommand({
  resource: 'input-file purpose',
  command: 'list',
  capabilityId: 'analysis.input_file.purpose.list',
  description: 'List input-file purposes the current user may upload in a project.',
  flags: [projectIdFlag],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id') }),
});
